//! The G1 launcher shell: search input → command registry → ranked rows →
//! dispatch. This is the spine lane B owns; panels replace the placeholder
//! result handling as they land (P1–P10).
//!
//! The search input is gpui-component's `Input` (vendored under
//! third-party/, themed by crate::theme) — IME, selection, clipboard and
//! caret behaviour come from the library instead of a hand-rolled editor.
//! Keyboard model (transcribed from the React launcher): Up/Down move the
//! selection, Enter dispatches, Escape hides the launcher, left/right and
//! editing keys stay with the input.

use gpui::{actions, div, prelude::*, px, App, Context, KeyBinding, Window};
use gpui_component::input::{Input, InputEvent, InputState};

use beam_ui::keystroke_chips;

use crate::command_registry::{
    self, rank_commands, CommandContext, CommandMode, CommandPanel, CommandRankingSignals,
    RankCommandsOptions, RankedCommand, DEFAULT_COMMAND_RANKING_CONFIG,
};

actions!(beam_launcher, [SelectNextCommand, SelectPrevCommand]);

/// Binds the shell's list navigation. Global context: the input holds focus,
/// and actions propagate up through the shell.
pub fn init(cx: &mut App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNextCommand, None),
        KeyBinding::new("up", SelectPrevCommand, None),
    ]);
}

pub struct RootView {
    input: gpui::Entity<InputState>,
    /// The shell keeps its own context handle — reading the app global from
    /// inside an entity update would re-enter the borrow.
    context: beam_core::BeamContext,
    query: String,
    ranked: Vec<RankedCommand>,
    /// The calculator inline row (None when the query is not math).
    calculator: Option<crate::calculator_inline::CalculatorResultRow>,
    /// Bumps on every query change so stale calculator responses are
    /// dropped (the React build's useDeferredValue + query-key semantics).
    calculator_generation: u64,
    selected: usize,
    active_mode: CommandMode,
    /// The panel router state (use-launcher-ui-store port).
    pub ui_state: gpui::Entity<crate::launcher_state::LauncherUiState>,
    /// Lazily-created panel surfaces keyed by panel id (panel retention:
    /// created once, kept mounted).
    panels: std::collections::HashMap<CommandPanel, gpui::AnyView>,
    glass_label: String,
    _subscriptions: Vec<gpui::Subscription>,
}

impl RootView {
    pub fn new(
        glass_label: String,
        context: beam_core::BeamContext,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) -> Self {
        let input = cx.new(|cx| {
            gpui_component::input::InputState::new(window, cx).placeholder("Search commands…")
        });

        // dmenu bus: CLI requests arrive as CliDmenuRequest events; bridge
        // them into the shell through a channel the spawn loop drains.
        let (dmenu_tx, dmenu_rx) =
            async_channel::unbounded::<crate::launcher_state::DmenuSession>();
        {
            let mut dmenu_receiver = context.events().subscribe();
            std::thread::spawn(move || loop {
                let Ok(event) = dmenu_receiver.blocking_recv() else {
                    break;
                };
                if let beam_core::BeamEvent::CliDmenuRequest(payload) = event {
                    let request_id = payload
                        .get("requestId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let initial_query = payload
                        .get("initialQuery")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let _ = dmenu_tx.send_blocking(crate::launcher_state::DmenuSession {
                        request_id,
                        initial_query,
                    });
                }
            });
        }

        let _subscriptions = vec![cx.subscribe_in(
            &input,
            window,
            move |this, _, event: &InputEvent, window, cx| match event {
                InputEvent::Change => {
                    let raw = this.input.read(cx).value().to_string();
                    this.on_query_changed(&raw, cx);
                }
                InputEvent::PressEnter { .. } => {
                    this.dispatch_selected(window, cx);
                }
                _ => {}
            },
        )];

        // Drain the dmenu channel: open the dmenu panel with each session.
        cx.spawn(async move |this, cx| {
            while let Ok(session) = dmenu_rx.recv().await {
                let _ = this.update(cx, |this, cx| {
                    this.ui_state.update(cx, |state, cx| {
                        state.open_dmenu_session(session.clone());
                        cx.notify();
                    });
                });
            }
        })
        .detach();

        let ui_state = cx.new(|_| crate::launcher_state::LauncherUiState::default());
        let mut view = Self {
            input,
            context,
            query: String::new(),
            ranked: Vec::new(),
            calculator: None,
            calculator_generation: 0,
            selected: 0,
            active_mode: CommandMode::Normal,
            ui_state,
            panels: std::collections::HashMap::new(),
            glass_label,
            _subscriptions,
        };
        view.on_query_changed("", cx);
        view
    }

    pub fn focus_input(&self, window: &mut Window, cx: &mut Context<Self>) {
        let focus_handle = gpui::Focusable::focus_handle(&*self.input.read(cx), cx);
        window.focus(&focus_handle, cx);
        cx.notify();
    }

    fn on_query_changed(&mut self, raw: &str, cx: &mut Context<Self>) {
        // Trigger parsing happens on the raw query ("$shutdown"), then the
        // stripped query drives the registry.
        let symbols = command_registry::TriggerSymbols::load(&self.context);
        let parsed = command_registry::parse_trigger_input(raw, CommandMode::Normal, &symbols);

        let (mode, query, triggered) = match &parsed {
            Some(parsed) => (
                parsed.mode,
                parsed.query.clone(),
                parsed.triggered_command_id.clone(),
            ),
            None => (CommandMode::Normal, raw.trim().to_string(), None),
        };

        let command_context = CommandContext {
            raw_query: raw.to_string(),
            query: query.clone(),
            quicklink_keyword: parsed
                .as_ref()
                .map(|p| p.quicklink_keyword.clone())
                .unwrap_or_default(),
            triggered_command_id: triggered,
            mode,
            active_panel: CommandPanel::Commands,
            is_desktop_runtime: true,
        };

        let commands = command_registry::static_commands();
        let mut ranked = rank_commands(RankCommandsOptions {
            commands: &commands,
            context: &command_context,
            signals: &CommandRankingSignals::default(),
            config: DEFAULT_COMMAND_RANKING_CONFIG,
            force_match_calculator_fallbacks: mode == CommandMode::Normal,
        });

        // Trigger modes constrain which commands are even visible.
        if parsed.is_some() {
            ranked.retain(|entry| {
                command_registry::matches_trigger_constraints(&entry.command, mode)
            });
        }

        self.query = query.clone();
        self.active_mode = mode;
        self.ranked = ranked;
        self.selected = 0;

        // Calculator inline row: evaluated off-thread, generation-keyed so a
        // slow response for an old query never lands.
        self.calculator = None;
        self.calculator_generation += 1;
        let generation = self.calculator_generation;
        let eval_context = self.context.clone();
        let eval_query = query.clone();
        cx.spawn(async move |this, cx| {
            let row = crate::calculator_inline::evaluate(&eval_context, &eval_query).await;
            let _ = this.update(cx, |this, cx| {
                if this.calculator_generation == generation {
                    this.calculator = row;
                    cx.notify();
                }
            });
        })
        .detach();

        cx.notify();
    }

    fn select_next(&mut self, _: &SelectNextCommand, _: &mut Window, cx: &mut Context<Self>) {
        if !self.ranked.is_empty() {
            self.selected = (self.selected + 1).min(self.ranked.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrevCommand, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }

    /// Opens a panel: routes through LauncherUiState and lazily creates
    /// the panel surface (panel retention — created once, kept mounted).
    fn open_panel(&mut self, panel: CommandPanel, window: &mut Window, cx: &mut Context<Self>) {
        self.ui_state
            .update(cx, |state, _| state.open_panel(panel, true));

        if !self.panels.contains_key(&panel) {
            let context = self.context.clone();
            let view: gpui::AnyView = match panel {
                CommandPanel::Settings => cx
                    .new(|cx| crate::settings_panel::SettingsPanel::open(cx))
                    .into(),
                CommandPanel::Clipboard => cx
                    .new(|cx| crate::clipboard_panel::ClipboardPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Notes => cx
                    .new(|cx| crate::notes_panel::NotesPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Snippets => cx
                    .new(|cx| crate::snippets_panel::SnippetsPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Todo => cx
                    .new(|cx| crate::todo_panel::TodoPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::ScriptCommands => cx
                    .new(|cx| {
                        crate::script_commands_panel::ScriptCommandsPanel::new(context.clone(), cx)
                    })
                    .into(),
                CommandPanel::Quicklinks => cx
                    .new(|cx| crate::quicklinks_panel::QuicklinksPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Focus => cx
                    .new(|cx| crate::focus_panel::FocusPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Dictionary => cx
                    .new(|cx| crate::dictionary_panel::DictionaryPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Translation => cx
                    .new(|cx| crate::translation_panel::TranslationPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::WindowSwitcher => cx
                    .new(|cx| {
                        let state = crate::app::services_state();
                        crate::window_switcher_panel::WindowSwitcherPanel::new(state, cx)
                    })
                    .into(),
                CommandPanel::Hyprwhspr => cx
                    .new(|cx| crate::hyprwhspr_panel::HyprwhsprPanel::new(cx))
                    .into(),
                CommandPanel::SpeedTest => cx
                    .new(|cx| crate::speed_test_panel::SpeedTestPanel::new(cx))
                    .into(),
                CommandPanel::FileSearch => cx
                    .new(|cx| crate::file_search_panel::FileSearchPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Emoji => cx
                    .new(|cx| crate::emoji_panel::EmojiPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::CalculatorHistory => cx
                    .new(|cx| {
                        crate::calculator_history_panel::CalculatorHistoryPanel::new(
                            context.clone(),
                            cx,
                        )
                    })
                    .into(),
                CommandPanel::Extensions => cx
                    .new(|cx| crate::extensions_panel::ExtensionsPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Ai => cx
                    .new(|cx| crate::ai_panel::AiPanel::new(context, window, cx))
                    .into(),
                CommandPanel::Dmenu => cx
                    .new(|cx| crate::dmenu_panel::DmenuPanel::new(context.clone(), cx))
                    .into(),
                CommandPanel::Commands | CommandPanel::ExtensionRunner => {
                    // Commands is the shell itself; the extension runner
                    // shell lands with its bus wiring slice.
                    return;
                }
            };
            self.panels.insert(panel, view);
        }
        cx.notify();
    }

    fn back_to_commands(&mut self, cx: &mut Context<Self>) {
        self.ui_state
            .update(cx, |state, _| state.back_to_commands());
        cx.notify();
    }

    fn dispatch_selected(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(entry) = self.ranked.get(self.selected) else {
            return;
        };
        let Some(action) = entry.command.action.as_ref() else {
            return;
        };

        match action.action_type {
            command_registry::CommandActionType::OpenPanel => {
                if let Some(payload) = &action.payload {
                    if let Some(panel) = payload.get("panel").and_then(|v| v.as_str()) {
                        if let Some(panel) = CommandPanel::parse(panel) {
                            self.open_panel(panel, window, cx);
                        }
                    }
                }
                cx.notify();
            }
            command_registry::CommandActionType::InvokeBackend => {
                let Some(payload) = &action.payload else {
                    return;
                };
                let backend = payload.get("command").and_then(|v| v.as_str());
                let args = payload
                    .get("args")
                    .cloned()
                    .unwrap_or(serde_json::json!({}));
                let context = self.context.clone();

                match backend {
                    Some("search_with_browser") => {
                        let site = args
                            .get("site")
                            .and_then(|v| v.as_str())
                            .unwrap_or("google");
                        let query = self.query.clone();
                        if let Err(error) = beam_services::search::search_with_browser(site, &query)
                        {
                            log::warn!("browser search failed: {error}");
                        }
                        let _ = context;
                    }
                    Some("execute_system_action") => {
                        let action_name = args.get("action").and_then(|v| v.as_str()).unwrap_or("");
                        log::info!("system action requested: {action_name}");
                        // Full dispatch lands with the action registry
                        // (dispatcher.ts port); system actions run through
                        // beam_services::system_actions then.
                    }
                    other => {
                        log::info!("backend action {other:?} awaits the dispatcher port")
                    }
                }
                cx.notify();
            }
            other => log::info!("action {other:?} awaits the dispatcher port"),
        }
    }
}

impl RootView {
    /// The panel surface for the active panel, or None for the root
    /// commands view (the ranked list renders).
    fn active_panel_view(&self, cx: &mut Context<Self>) -> Option<impl IntoElement> {
        let active = self.ui_state.read(cx).active_panel;
        if active == CommandPanel::Commands {
            return None;
        }
        self.panels.get(&active).map(|view| {
            div()
                .absolute()
                .size_full()
                .bg(beam_ui::shell_plate(true, 0.95))
                .child(view.clone())
        })
    }
}

impl Render for RootView {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let mode_label = match self.active_mode {
            CommandMode::Normal => "",
            CommandMode::Compressed => "compressed",
            CommandMode::QuicklinkTrigger => "quicklink",
            CommandMode::SystemTrigger => "system",
            CommandMode::ScriptTrigger => "script",
            CommandMode::ShellTrigger => "shell",
        };

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("Launcher")
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .child(
                // SearchBar skeleton — 56px tall per the §04 spec.
                div()
                    .h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .flex()
                    .items_center()
                    .border_b_1()
                    .border_color(beam_ui::divider())
                    .child(Input::new(&self.input).focus_bordered(false)),
            )
            .child(
                // CommandList skeleton — uniform rows with the wash ladder.
                div()
                    .flex_1()
                    .flex()
                    .flex_col()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .children(
                        self.ranked
                            .iter()
                            .enumerate()
                            .take(12)
                            .map(|(index, entry)| {
                                let is_selected = index == selected;
                                div()
                                    .flex()
                                    .items_center()
                                    .justify_between()
                                    .px_3()
                                    .py_2()
                                    .rounded(px(beam_ui::RADIUS_ROW))
                                    .when(is_selected, |row| {
                                        row.bg(beam_ui::row_selected())
                                            .border_1()
                                            .border_color(beam_ui::border())
                                    })
                                    .child(
                                        div()
                                            .flex()
                                            .flex_col()
                                            .text_size(px(beam_ui::TEXT_MD))
                                            .text_color(beam_ui::ink())
                                            .child(entry.command.title.clone())
                                            .children(entry.command.subtitle.clone().map(
                                                |subtitle| {
                                                    div()
                                                        .text_size(px(beam_ui::TEXT_SM))
                                                        .text_color(beam_ui::ink_dim())
                                                        .child(subtitle)
                                                },
                                            )),
                                    )
                                    .children(entry.command.end_text.clone().map(|end| {
                                        div()
                                            .text_size(px(beam_ui::TEXT_2XS))
                                            .text_color(beam_ui::ink_faint())
                                            .child(end)
                                    }))
                            }),
                    ),
            )
            .child(
                // FooterBar skeleton — 42px, mode indicator left, hints right.
                div()
                    .h(px(beam_ui::FOOTER_HEIGHT))
                    .px_4()
                    .flex()
                    .items_center()
                    .justify_between()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!(
                                "beam · glass {}{}",
                                self.glass_label,
                                if mode_label.is_empty() {
                                    String::new()
                                } else {
                                    format!(" · {mode_label} mode")
                                }
                            )),
                    )
                    .child(
                        div()
                            .flex()
                            .gap_2()
                            .items_center()
                            .child(keystroke_chips("UP+DOWN"))
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child("navigate"),
                            )
                            .child(keystroke_chips("ENTER"))
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child("run"),
                            ),
                    ),
            )
    }
}

use std::thread;
use std::time::{Duration, Instant};

use x11rb::atom_manager;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, CreateWindowAux, EventMask, WindowClass};
use x11rb::protocol::Event;
use x11rb::rust_connection::RustConnection;
use x11rb::{COPY_DEPTH_FROM_PARENT, CURRENT_TIME, NONE};

atom_manager! {
    pub SelectionAtoms: SelectionAtomsCookie {
        PRIMARY,
        STRING,
        TEXT,
        UTF8_STRING,
        BEAM_SELECTION,
    }
}

fn open_connection() -> Result<(RustConnection, usize, SelectionAtoms), String> {
    let (connection, screen_num) =
        x11rb::connect(None).map_err(|error| format!("failed to connect to X11: {error}"))?;
    let atoms = SelectionAtoms::new(&connection)
        .map_err(|error| format!("failed to request X11 selection atoms: {error}"))?
        .reply()
        .map_err(|error| format!("failed to read X11 selection atoms: {error}"))?;
    Ok((connection, screen_num, atoms))
}

fn request_selection(
    connection: &RustConnection,
    screen_num: usize,
    target: u32,
    property: u32,
) -> Result<String, String> {
    let root = connection.setup().roots[screen_num].root;
    let window = connection
        .generate_id()
        .map_err(|error| format!("failed to allocate X11 window id: {error}"))?;

    connection
        .create_window(
            COPY_DEPTH_FROM_PARENT as u8,
            window,
            root,
            0,
            0,
            1,
            1,
            0,
            WindowClass::INPUT_OUTPUT,
            0,
            &CreateWindowAux::new().event_mask(EventMask::PROPERTY_CHANGE),
        )
        .map_err(|error| format!("failed to create X11 selection window: {error}"))?;

    connection
        .convert_selection(
            window,
            AtomEnum::PRIMARY.into(),
            target,
            property,
            CURRENT_TIME,
        )
        .map_err(|error| format!("failed to request X11 PRIMARY selection: {error}"))?;
    connection
        .flush()
        .map_err(|error| format!("failed to flush X11 selection request: {error}"))?;

    let deadline = Instant::now() + Duration::from_millis(800);
    let result = loop {
        if let Some(event) = connection
            .poll_for_event()
            .map_err(|error| format!("failed to poll X11 events: {error}"))?
        {
            match event {
                Event::SelectionNotify(event) if event.requestor == window => {
                    if event.property == NONE {
                        break Err("PRIMARY selection did not provide text data".to_string());
                    }

                    let reply = connection
                        .get_property(false, window, property, AtomEnum::ANY, 0, u32::MAX)
                        .map_err(|error| {
                            format!("failed to fetch X11 selection property: {error}")
                        })?
                        .reply()
                        .map_err(|error| {
                            format!("failed to read X11 selection property: {error}")
                        })?;

                    let text = String::from_utf8_lossy(&reply.value)
                        .trim_matches('\0')
                        .to_string();
                    break Ok(text);
                }
                _ => {}
            }
        }

        if Instant::now() >= deadline {
            break Err("timed out while waiting for X11 PRIMARY selection".to_string());
        }

        thread::sleep(Duration::from_millis(10));
    };

    let _ = connection.destroy_window(window);
    let _ = connection.flush();
    result
}

pub fn x11_primary_selection_supported() -> bool {
    open_connection().is_ok()
}

pub fn read_x11_primary_selection() -> Result<String, String> {
    let (connection, screen_num, atoms) = open_connection()?;

    for target in [atoms.UTF8_STRING, atoms.TEXT, AtomEnum::STRING.into()] {
        if let Ok(value) = request_selection(&connection, screen_num, target, atoms.BEAM_SELECTION)
        {
            if !value.trim().is_empty() {
                return Ok(value);
            }
        }
    }

    Err("PRIMARY selection is unavailable on this X11 session".to_string())
}

#[cfg(test)]
mod tests {
    use super::x11_primary_selection_supported;

    #[test]
    fn helper_probe_is_callable() {
        let _ = x11_primary_selection_supported();
    }
}

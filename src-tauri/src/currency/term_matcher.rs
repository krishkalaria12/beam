const SUPPORTED_CURRENCY_CODES: &[&str] = &[
    "aed", "afn", "all", "amd", "ang", "aoa", "ars", "aud", "awg", "azn", "bam", "bbd", "bdt",
    "bgn", "bhd", "bif", "bmd", "bnd", "bob", "brl", "bsd", "btn", "bwp", "byr", "bzd", "cad",
    "cdf", "chf", "clp", "cny", "cop", "crc", "cuc", "cup", "cve", "czk", "djf", "dkk", "dop",
    "dzd", "egp", "ern", "etb", "eur", "fjd", "fkp", "gbp", "gel", "ghs", "gip", "gmd", "gnf",
    "gtq", "gyd", "hkd", "hnl", "hrk", "htg", "huf", "idr", "ils", "inr", "iqd", "irr", "isk",
    "jmd", "jod", "jpy", "kes", "kgs", "khr", "kmf", "kpw", "krw", "kwd", "kyd", "kzt", "lak",
    "lbp", "lkr", "lrd", "lsl", "lyd", "mad", "mdl", "mga", "mkd", "mmk", "mnt", "mop", "mro",
    "mtl", "mur", "mvr", "mwk", "mxn", "myr", "mzn", "nad", "ngn", "nio", "nok", "npr", "nzd",
    "omr", "pab", "pen", "pgk", "php", "pkr", "pln", "pyg", "qar", "ron", "rsd", "rub", "rwf",
    "sar", "sbd", "scr", "sdd", "sdg", "sek", "sgd", "shp", "sll", "sos", "srd", "std", "svc",
    "syp", "szl", "thb", "tjs", "tmt", "tnd", "top", "try", "ttd", "tvd", "twd", "tzs", "uah",
    "ugx", "usd", "uyu", "uzs", "veb", "vef", "vnd", "vuv", "won", "wst", "xaf", "xbt", "xcd",
    "xof", "xpf", "yer", "zar", "zmw",
];

const CURRENCY_WORD_HINTS: &[&str] = &[
    "dollar", "rupee", "euro", "pound", "yen", "franc", "dinar", "rial", "riyal", "peso", "lira",
    "dirham", "koruna", "krona", "krone", "ringgit", "rand", "forint", "baht", "won", "leu",
    "real", "zloty", "hryvnia", "shilling", "som", "dong", "taka", "naira", "ruble", "kwacha",
    "kuna", "shekel", "colon", "dram", "ariary", "ouguiya", "pataca", "kip", "lari", "metical",
    "escudo", "guarani", "bolivar",
];

pub fn has_currency_like_term(text: &str) -> bool {
    let filtered = text
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphabetic() || ch.is_whitespace() {
                ch.to_ascii_lowercase()
            } else {
                ' '
            }
        })
        .collect::<String>();

    let words = filtered.split_whitespace().collect::<Vec<_>>();
    let Some(last_word) = words.last() else {
        return false;
    };

    if last_word.len() == 3 {
        return SUPPORTED_CURRENCY_CODES.contains(last_word);
    }

    if last_word.len() < 4 {
        return false;
    }

    if words.len() >= 2 {
        return true;
    }

    CURRENCY_WORD_HINTS.contains(last_word)
}

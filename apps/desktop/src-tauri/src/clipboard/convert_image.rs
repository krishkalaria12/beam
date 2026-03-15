use arboard::ImageData;
use base64::{engine::general_purpose, Engine as _};
use image::ImageFormat;
use std::io::Cursor;

pub fn get_image_as_base64(image_data: ImageData) -> Option<String> {
    let img = image::ImageBuffer::<image::Rgba<u8>, _>::from_raw(
        image_data.width as u32,
        image_data.height as u32,
        image_data.bytes.into_owned(),
    )?;

    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);

    img.write_to(&mut cursor, ImageFormat::Png).ok()?;

    let base64_string = general_purpose::STANDARD.encode(buffer);

    Some(format!("data:image/png;base64,{}", base64_string))
}

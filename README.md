# PNGDrive

Pack your files into a PNG.

## Demo

http://pngdrive.devinhaus.com/

### Steganography

PNGDrive now supports Steganography: Files can be injected into a target bitmap.
[Here is an example of PNGDrive Steganography in action](http://pngdrive.devinhaus.com/examples/decode_steganography.html),
showing the Commodore 64 operating system ROMs injected into a Commodore logo with
different numbers of bits per color component (2, 4, 6 and 8, from left to right):

![](https://github.com/MadeInHaus/PNGDrive/raw/master/examples/images/commodore_2bit.png)
![](https://github.com/MadeInHaus/PNGDrive/raw/master/examples/images/commodore_4bit.png)
![](https://github.com/MadeInHaus/PNGDrive/raw/master/examples/images/commodore_6bit.png)
![](https://github.com/MadeInHaus/PNGDrive/raw/master/examples/images/commodore_8bit.png)

## Usage

### Preparation

	<script src="pngdrive-min.js"></script>

### Decode

	<script>
		var img = new Image();
		img.src = "image.png";
		img.onload = function() {
			var pngdrive = new PNGDrive(img);
			var numFiles = pngdrive.getFileCount();
			for (var i = 0; i < numFiles; i++) {
				var file = pngdrive.getFileAt(i);
				console.log(file.name, file.type, file.content);
			}
		}
	</script>

### Encode

	<div id="file-drop-area">Drop files here</div>

	<script>
		var pngdrive = new PNGDrive();

		document.getElementById("file-drop-area").addEventListener('drop', handleFileSelect, false);

		function handleFileSelect(event) {
			event.preventDefault();
			event.stopPropagation();
			var files = event.dataTransfer.files;
			for (var i = 0, file; file = files[i]; i++) {
				pngdrive.addFile(file);
			}
			pngdrive.encode(function() {
				var canvas = this.createImage();
				// etc..
			});
		};
	</script>

### More examples

http://pngdrive.devinhaus.com/examples/decode.html  
http://pngdrive.devinhaus.com/examples/decode_js.html  
http://pngdrive.devinhaus.com/examples/decode_steganography.html
http://pngdrive.devinhaus.com/examples/encode_file_drag_drop.html  
http://pngdrive.devinhaus.com/examples/encode_file_select.html  
http://pngdrive.devinhaus.com/examples/encode_text.html  

## API

### `PNGDrive(image, bitsPerColorComponent)`

- `image` (`HTMLImageElement` or `HTMLCanvasElement`, *optional*). The image to decode.
- `bitsPerColorComponent` (Number, *optional*). Valid values: 1-8. Defaults to 8.

Constructor.

	var pngdrive = new PNGDrive();

------

### `addTextFile(text, name, type)`

- `text` (String). The contents of the file.
- `name` (String). The file name.
- `type` (String, *optional*). The mime type of the file.

Adds a text file to the archive.

	pngdrive.addTextFile("PNGDrive rocks!", "info.txt", "text/plain");

------

### `addBinaryFile(uint8array, name, type)`

- `uint8array` (`Uint8Array`). The contents of the file.
- `name` (String). The file name.
- `type` (String, *optional*). The mime type of the file.

Adds a binary file to the archive.

	pngdrive.addBinaryFile(new Uint8Array([0x13, 0x37]), "trash.bin");

------

### `addFile(file)`

- `file` (`File`). The file to add.

Adds a file to the archive. This method is typically used with `<input type="file">` elements or the `drop` event. See the [encoding example](#encode) above.

------

### `removeAll()`

Removes all files from the archive.

------

### `removeFileAt(index)`

- `index` (Integer).

Removes the file at the specified index from the archive.

------

### `removeFileByName(name)`

- `name` (String). The name of the file.

Removes the file with the specified name from the archive.

------

### `getFileCount()`

Returns the number of files in the archive.

------

### `getFileAt(index)`

- `index` (Integer).

Returns the file at the specified index.

------

### `getFileByName(name)`

- `name` (String). The name of the file.

Returns the file with the specified name.

------

### `decode(image, bitsPerColorComponent)`

- `image` (`HTMLImageElement` or `HTMLCanvasElement`). The image to decode.
- `bitsPerColorComponent` (Number, *optional*). Valid values: 1-8. Defaults to 8.

Extracts files from the supplied image.

	var pngdrive = new PNGDrive();
	var image = new Image();
	image.src = "image.png";
	image.onload = function(event) {
		pngdrive.decode(event.target);
	}

------

### `encode(callback)`

- `callback` (`Function`, *optional*). The callback function to call when PNGDrive is done encoding.

Encodes all files into a binary array in preparation to `createImage()`.

	var pngdrive = new PNGDrive();
	pngdrive.addTextFile("PNGDrive rocks!", "info.txt", "text/plain");
	pngdrive.encode(function() {
		var image = this.createImage();
	});

------

### `createImage(targetImage, bitsPerColorComponent)`

- `targetImage` (`HTMLImageElement` or `HTMLCanvasElement`, *optional*). An image to inject data into.
- `bitsPerColorComponent` (Number, *optional*). Valid values: 1-8. Defaults to 8.

Creates a new image with encoded files or, if a target image is supplied, injects encoded files into that image.

Returns `HTMLCanvasElement`.

	var pngdrive = new PNGDrive();
	pngdrive.addTextFile("PNGDrive rocks!", "info.txt", "text/plain");
	pngdrive.encode(function() {
		var image = this.createImage();
	});

------

### `computeImageCapacity(targetImage, bitsPerColorComponent)`

- `targetImage` (`HTMLImageElement` or `HTMLCanvasElement`). An image to inject data into.
- `bitsPerColorComponent` (Number, *optional*). Valid values: 1-8. Defaults to 8.

This method can be used in preparation to `createImage()` to compute the maximum capacity of a target image.

Returns number of bits that fit into the target image.

------

### `utfEncode(string)`

- `string` (String). Text to encode.

Returns `Uint8Array` containing the encoded string.

------

### `utfDecode(array)`

- `array` (`Uint8Array`). Array to decode.

Returns the decoded string.


## How?

PNGDrive stores data in the first three bytes (RGB) of a 32bit pixel value.
The forth byte (alpha value) is always set to 0xFF (255). If data is injected into a
target image (Steganography), pixels with alpha transparency are ignored.
Only fully opaque pixels can be used for data storage due to limitations
in the Canvas API. See the following note from the
[WhatWG Canvas Spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-getimagedata)
for an explanation:

> Due to the lossy nature of converting to and from
> premultiplied alpha color values, pixels that have just been set using putImageData()
> might be returned to an equivalent getImageData() as different values.

### File Format

	Bytes 0..1           INTRO (Intro marker, 0xDADA)
	Bytes 2              VERSION_HI (File format version info, major)
	Bytes 3              VERSION_LO (File format version info, minor)
	Bytes 4..7           DIRLEN (Length of DIR in bytes, 32 bits, little endian)
	Bytes 8..8+DIRLEN-1  DIR (Directory in JSON format)
    Bytes 8+DIRLEN..     PAYLOAD

Example DIR structure:

	{
		files: [
			{ "name": "text.txt", "size": 12345, "type": "text/plain" },
			{ "name": "image.jpg", "size": 23456, "type": "image/jpeg" },
			{ "name": "binary.bin", "size": 34567 }
		]
	}

## Who?

Claus Wahlers (claus at madeinhaus dot com)

[![Made in HAUS](https://github.com/MadeInHaus/PNGDrive/raw/master/README_LOGO.png "Made in HAUS")](http://madeinhaus.com/)

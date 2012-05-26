# PNGDrive

Pack your files into a PNG.

## Demo

http://pngdrive.devinhaus.com/

And here's Hamlet in a PNG:

![PNGDrive source code in a PNG](https://github.com/MadeInHaus/PNGDrive/raw/master/pngdrive.png)

## Usage

### Preparation

	<script src="lib/pngdrive-min.js"></script>

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
				var imgEl = this.getImgElement();
				var imgSize = this.getImgSize();
				// etc..
			});
		};
	</script>

### Decode

	<img id="pngdrive-image" src="pngdrive.png">

	<script>
		var pngdrive = new PNGDrive();
		var pngdriveImage = document.getElementById("pngdrive-image");

		pngdriveImage.addEventListener('click', handleImageClick);

		function handleImageClick(event) {
			pngdrive.decode(pngdriveImage);
			var numFiles = pngdrive.getFileCount();
			for (var i = 0; i < numFiles; i++) {
				var file = pngdrive.getFileAt(i);
				console.log(file.name, file.type, file.content);
			}
		}
	</script>

## API

Working on it..

## Who?

Claus Wahlers (claus at madeinhaus dot com)

http://madeinhaus.com/

## Credits

PNGDrive.js uses TextEncoder/TextDecoder from the stringencoding project:

http://code.google.com/p/stringencoding/

Licensed under Apache License 2.0

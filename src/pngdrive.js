window.PNGDrive = function() {

	this.VERSION_MAJOR = 1;
	this.VERSION_MINOR = 0;

	this.files = [];
	this.raw = new Uint8Array(0);

};

window.PNGDrive.prototype = {

	addFile: function(file) {
		this.files.push({ name: file.name, type: file.type, fileRef: file });
	},

	addTextFile: function(text, name, type) {
		this.files.push({ name: name, type: type, content: TextEncoder("utf-8").encode(text) });
	},

	removeAll: function() {
		this.files = [];
	},

	removeFileAt: function(index) {
		if(index >= 0 && index < this.files.length) {
			this.files.splice(index, 1);
		}
	},

	removeFileByName: function(name) {
		for(var i = 0; i < this.files.length; i++) {
			if(this.files[i].name == name) {
				this.files.splice(i, 1);
				break;
			}
		}
	},

	getFileCount: function() {
		return this.files.length;
	},

	getFileAt: function(index) {
		return (index >= 0 && index < this.files.length) ? this.files[index] : null;
	},

	getFileByName: function(name) {
		for(var i = 0; i < this.files.length; i++) {
			if(this.files[i].name == name) {
				return this.files[i];
			}
		}
		return null;
	},

	decode: function(image) {
		var canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);
		var img = ctx.getImageData(0, 0, image.width, image.height);
		var imgData = img.data;
		var length = imgData.length; i = 0, j = 0;
		this.raw = new Uint8Array(image.width * image.height * 3);
		while(i < length) {
			if(i % 4 != 3) {
				this.raw[j++] = imgData[i];
			}
			i++;
		}
		this.deserialize();
	},

	encode: function(callback) {
		var that = this;
		var numFilesToLoad = 0;
		var fileCount = this.files.length;
		this._dataURL = null;
		this._canvasElement = null;
		for(var i = 0; i < fileCount; i++) {
			var file = this.files[i];
			if(file.fileRef) {
				numFilesToLoad++;
				var reader = new FileReader();
				reader.onload = (function(f) {
					return function(event) {
						f.content = new Uint8Array(event.target.result);
						delete f.fileRef;
						if(--numFilesToLoad == 0 && i == fileCount) {
							numFilesToLoad = -1;
							that.serialize();
							if(callback) {
								callback.call(that);
							}
						}
					};
				})(file);
				reader.readAsArrayBuffer(file.fileRef);
			}
		}
		if(numFilesToLoad == 0) {
			this.serialize();
			if(callback) {
				callback.call(this);
			}
		}
	},

	serialize: function() {
		var j, pos, file;
		var dir = { files: [] };
		var payLoadSize = 0;
		var fileCount = this.files.length;
		for(j = 0; j < fileCount; j++) {
			file = this.files[j];
			payLoadSize += file.content.byteLength;
			dir.files.push({ name: file.name, size: file.content.byteLength, type: file.type });
		}
		var dirBuf = TextEncoder("utf-8").encode(JSON.stringify(dir));
		var dirSize = dirBuf.byteLength;
		var totalSize = 8 + dirSize + payLoadSize;
		var buf = this.raw = new Uint8Array(new ArrayBuffer(totalSize));
		// intro, 0xDADA
		buf[0] = buf[1] = 0xda;
		// version, major/minor
		buf[2] = this.VERSION_MAJOR;
		buf[3] = this.VERSION_MINOR;
		// directory size, 32 bit little endian
		buf[4] = dirSize & 0xff;
		buf[5] = (dirSize >> 8) & 0xff;
		buf[6] = (dirSize >> 16) & 0xff;
		buf[7] = (dirSize >> 24) & 0xff;
		// write directory
		buf.set(dirBuf, 8);
		// write files
		for(j = 0, pos = 8 + dirBuf.byteLength; j < fileCount; j++) {
			file = this.files[j];
			buf.set(file.content, pos);
			pos += file.content.byteLength;
		}
	},

	deserialize: function() {
		var buf = this.raw;
		if(buf[0] == 0xda && buf[1] == 0xda) {
			var versionHi = buf[2];
			var versionLo = buf[3];
			var dirSize = buf[4] | buf[5] << 8 | buf[6] << 16 | buf[7] << 24;
			var dirBuf = buf.subarray(8, 8 + dirSize);
			var dir = JSON.parse(TextDecoder("utf-8").decode(dirBuf));
			var pos = 8 + dirSize;
			this.files = [];
			for(i = 0; i < dir.files.length; i++) {
				var file = dir.files[i];
				var fileBuf = new Uint8Array(file.size);
				fileBuf.set(buf.subarray(pos, pos + file.size));
				pos += file.size;
				this.files.push({ name: file.name, type: file.type, content: fileBuf });
			}
		}
	},

	getCanvasElement: function() {
		if(!this._canvasElement) {
			var px = this.getImgSize();
			if(px > 0) {
				this._canvasElement = document.createElement('canvas');
				this._canvasElement.height = px;
				this._canvasElement.width = px;
				var ctx = this._canvasElement.getContext('2d');
				var img = ctx.getImageData(0, 0, px, px);
				var imgData = img.data;
				var length = this.raw.byteLength;
				var i = 0, j = 0;
				while(i < length) {
					imgData[j] = (j++ % 4 == 3) ? 255 : this.raw[i++];
				}
				ctx.putImageData(img, 0, 0);
			}
		}
		return this._canvasElement;
	},

	getDataURL: function() {
		if(!this._dataURL) {
			var canvas = this.getCanvasElement();
			this._dataURL = canvas ? canvas.toDataURL() : "";
		}
		return this._dataURL;
	},

	getImgElement: function() {
		var px = this.getImgSize();
		if(px > 0) {
			var img = document.createElement('img');
			img.height = px;
			img.width = px;
			img.src = this.getDataURL();
			return img;
		} else {
			return null;
		}
	},

	getImgSize: function() {
		return Math.ceil(Math.sqrt(this.getUncompressedSize() / 3));
	},

	getCompressedSize: function() {
		var dataURL = this.getDataURL();
		return (dataURL && dataURL.length > 0) ? atob(dataURL.split(",")[1]).length : 0;
	},

	getUncompressedSize: function() {
		return this.raw.byteLength;
	}
};

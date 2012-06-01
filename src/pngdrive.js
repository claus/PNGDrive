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

	addBinaryFile: function(uint8Array, name, type) {
		this.files.push({ name: name, type: type, content: uint8Array });
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

	decode: function(image, bitsPerColorComponent) {
		if (typeof bitsPerColorComponent == "undefined") { bitsPerColorComponent = 8; }
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0);
		var img = ctx.getImageData(0, 0, image.width, image.height);
		var imgData = img.data;
		var length = imgData.length;
		var buf = this.raw = new Uint8Array(image.width * image.height * 3);
		var i = 0;
		if(bitsPerColorComponent == 8) {
			var j = 0;
			while(i < length) {
				if(imgData[i + 3] == 0xff) {
					buf[j++] = imgData[i++];
					buf[j++] = imgData[i++];
					buf[j++] = imgData[i++];
					i++;
				} else {
					i += 4;
				}
			}
		} else {
			var bitStream = new PNGDriveBitStream(buf);
			while(i < length) {
				if(imgData[i + 3] == 0xff) {
					bitStream.writeBits(bitsPerColorComponent, imgData[i++]);
					bitStream.writeBits(bitsPerColorComponent, imgData[i++]);
					bitStream.writeBits(bitsPerColorComponent, imgData[i++]);
					i++;
				} else {
					i += 4;
				}
			}
		}
		if(buf[0] == 0xda && buf[1] == 0xda) {
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

	encode: function(callback) {
		var that = this;
		(function(serialize) {
			var numFilesToLoad = 0;
			var fileCount = that.getFileCount();
			for(var i = 0; i < fileCount; i++) {
				var file = that.files[i];
				if(file.fileRef) {
					numFilesToLoad++;
					var reader = new FileReader();
					reader.onload = (function(f) {
						return function(event) {
							f.content = new Uint8Array(event.target.result);
							delete f.fileRef;
							if(--numFilesToLoad == 0 && i == fileCount) {
								numFilesToLoad = -1;
								serialize.call(that);;
							}
						};
					})(file);
					reader.readAsArrayBuffer(file.fileRef);
				}
			}
			if(numFilesToLoad == 0) {
				serialize.call(that);;
			}
		})(function() {
			var fileCount = this.getFileCount();
			if(fileCount > 0) {
				var j, pos, file;
				var dir = { files: [] };
				var payLoadSize = 0;
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
			} else {
				this.raw = new Uint8Array(0);
			}
			if(callback) {
				callback.call(this);
			}
		});
	},

	createImage: function(targetImage, bitsPerColorComponent) {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		if(typeof targetImage == "undefined") {
			bitsPerColorComponent = 8;
			var px = Math.ceil(Math.sqrt(this.raw.byteLength / 3));
			canvas.width = px;
			canvas.height = px;
			ctx.fillRect(0, 0, px, px);
		} else {
			if(typeof bitsPerColorComponent == "undefined") { bitsPerColorComponent = 8; }
			canvas.width = targetImage.width;
			canvas.height = targetImage.height;
			ctx.drawImage(targetImage, 0, 0);
		}
		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var imgData = img.data;
		var imgLength = imgData.length;
		var i = 0;
		if(bitsPerColorComponent == 8) {
			var j = 0;
			while(i < imgLength) {
				if(imgData[i + 3] == 0xff) {
					imgData[i++] = this.raw[j++];
					imgData[i++] = this.raw[j++];
					imgData[i++] = this.raw[j++];
					i++;
				} else {
					i += 4;
				}
			}
		} else {
			var bitStream = new PNGDriveBitStream(this.raw);
			var bitMask = 0xff ^ (0xff >>> (8 - bitsPerColorComponent));
			while(i < imgLength) {
				if(imgData[i + 3] == 0xff) {
					imgData[i] = (imgData[i++] & bitMask) | bitStream.readBits(bitsPerColorComponent);
					imgData[i] = (imgData[i++] & bitMask) | bitStream.readBits(bitsPerColorComponent);
					imgData[i] = (imgData[i++] & bitMask) | bitStream.readBits(bitsPerColorComponent);
					i++;
				} else {
					i += 4;
				}
			}
		}
		ctx.putImageData(img, 0, 0);
		return canvas;
	}

};


window.PNGDriveBitStream = function(uint8Array) {

	this.a = uint8Array;
	this.position = 0;
	this.bitsPending = 0;

};

window.PNGDriveBitStream.prototype = {

	writeBits: function(bits, value) {
		if (bits == 0) { return; }
		value &= (0xffffffff >>> (32 - bits));
		var bitsConsumed;
		if (this.bitsPending > 0) {
			if (this.bitsPending > bits) {
				this.a[this.position - 1] |= value << (this.bitsPending - bits);
				bitsConsumed = bits;
				this.bitsPending -= bits;
			} else if (this.bitsPending == bits) {
				this.a[this.position - 1] |= value;
				bitsConsumed = bits;
				this.bitsPending = 0;
			} else {
				this.a[this.position - 1] |= value >> (bits - this.bitsPending);
				bitsConsumed = this.bitsPending;
				this.bitsPending = 0;
			}
		} else {
			bitsConsumed = Math.min(8, bits);
			this.bitsPending = 8 - bitsConsumed;
			this.a[this.position++] = (value >> (bits - bitsConsumed)) << this.bitsPending;
		}
		bits -= bitsConsumed;
		if (bits > 0) {
			this.writeBits(bits, value);
		}
	},

	readBits: function(bits, bitBuffer) {
		if (typeof bitBuffer == "undefined") { bitBuffer = 0; }
		if (bits == 0) { return bitBuffer; }
		var partial;
		var bitsConsumed;
		if (this.bitsPending > 0) {
			var b = this.a[this.position - 1] & (0xff >> (8 - this.bitsPending));
			bitsConsumed = Math.min(this.bitsPending, bits);
			this.bitsPending -= bitsConsumed;
			partial = b >> this.bitsPending;
		} else {
			bitsConsumed = Math.min(8, bits);
			this.bitsPending = 8 - bitsConsumed;
			partial = this.a[this.position++] >> this.bitsPending;
		}
		bits -= bitsConsumed;
		bitBuffer = (bitBuffer << bitsConsumed) | partial;
		return (bits > 0) ? this.readBits(bits, bitBuffer) : bitBuffer;
	},

	seekTo: function(bitPos) {
		this.position = (bitPos / 8) | 0;
		this.bitsPending = bitPos % 8;
		if(this.bitsPending > 0) {
			this.bitsPending = 8 - this.bitsPending;
			this.position++;
		}
	}

};

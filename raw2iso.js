'use strict';

const path = require('path');
const fs = require('fs');
const assert = require('assert').strict;

let args = process.argv.slice(2);
let usage = 'Convert raw optical disk images to iso files.\n\nUsage: node raw2iso.js <mode MODE1_RW_RAW> <input INPUT.BIN> <output OUTPUT.ISO>\n\n<track-mode>: MODE1_RAW | MODE1 | MODE2_RAW | MODE2_FORM1 | MODE2_FORM2 | MODE2_FORM_MIX\n<sub-channel-mode>: RW | RW_RAW\n\n(See cdrdao(1) -> TOC FILES -> Track Specification -> TRACK.)\n\nNote: Error correction/detection data is not checked (try\nhttps://github.com/claunia/edccchk) and errors are not corrected.\n\nraw2iso - https://github.com/mrhso/raw2iso-nodejs\nOriginal: https://github.com/not-a-user/raw2iso';

let track_mode = args[0];
let input_file = args[1];
if (!input_file) {
    console.error(usage);
    process.exit(1);
};
let output_file = args[2] || `${input_file.substring(0, input_file.length - path.extname(input_file).length)}.iso`;

const SECTOR_SIZE = 2048;

let sector_raw_size;
let sector_offset;

track_mode = track_mode.split('_');
const includes = (arr) => {
    for (let value of arr) {
        if (!track_mode.includes(value)) {
            return false;
        };
    };
    return true;
};

if (includes(['MODE1', 'RAW'])) {
    sector_raw_size = 2352;
    sector_offset = 16;
} else if (includes(['MODE1']) || includes(['MODE2', 'FORM1'])) {
    sector_raw_size = 2048;
    sector_offset = 0;
} else if (includes(['MODE2', 'RAW'])) {
    sector_raw_size = 2352;
    sector_offset = 24;
} else if (includes(['MODE2', 'FORM2'])) {
    sector_raw_size = 2324;
    sector_offset = 0;
} else if (includes(['MODE2', 'FORM', 'MIX'])) {
    sector_raw_size = 2336;
    sector_offset = 8;
} else {
    console.error(usage);
    process.exit(1);
};
if (includes(['RW'])) {
    sector_raw_size += 96;
};

assert.ok(sector_raw_size >= SECTOR_SIZE + sector_offset);

let raw = fs.readFileSync(input_file);
let iso = [];

let k = 0;
let offset = 0;
while (true) {
    let sector = raw.slice(offset, offset + sector_raw_size);
    offset += sector_raw_size;
    let got = sector.length;
    if (got === 0) {
        iso = Buffer.concat(iso);
        fs.writeFileSync(output_file, iso);
        console.log(`converted ${k} sectors`);
        process.exit(0);
    } else if (got === sector_raw_size) {
        let to_write = sector.slice(sector_offset, sector_offset + SECTOR_SIZE);
        iso.push(to_write);
        assert.ok(to_write.length === SECTOR_SIZE);
    } else {
        iso = Buffer.concat(iso);
        fs.writeFileSync(output_file, iso);
        console.error('input is corrupted');
        process.exit(1);
    };
    k += 1;
};

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const MUSIC_DIR = path.join(__dirname, 'resources/music');
const SCRIPT_FILE = path.join(__dirname, 'script.js');
const MUSIC_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

// Read all music files from the directory
function getMusicFiles() {
    try {
        const files = fs.readdirSync(MUSIC_DIR);
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return MUSIC_EXTENSIONS.includes(ext);
            })
            .sort();
    } catch (error) {
        console.error('Error reading music directory:', error.message);
        process.exit(1);
    }
}

// Update the commonNames array in script.js
function updateScriptFile(musicFiles) {
    try {
        let scriptContent = fs.readFileSync(SCRIPT_FILE, 'utf8');

        // Create the new commonNames array with proper indentation
        const indent = '            ';
        const commonNamesArray = musicFiles
            .map(file => `${indent}'${file}'`)
            .join(',\n');

        const newCommonNames = `const commonNames = [\n${commonNamesArray}\n        ];`;

        // Replace the existing commonNames array
        // This regex matches the entire commonNames array declaration
        const regex = /const commonNames = \[[^\]]*\];/s;

        if (!regex.test(scriptContent)) {
            console.error('Could not find commonNames array in script.js');
            process.exit(1);
        }

        scriptContent = scriptContent.replace(regex, newCommonNames);

        // Write the updated content back
        fs.writeFileSync(SCRIPT_FILE, scriptContent, 'utf8');

        console.log('✓ Successfully updated script.js');
        console.log(`✓ Found ${musicFiles.length} music file(s):`);
        musicFiles.forEach(file => console.log(`  - ${file}`));

    } catch (error) {
        console.error('Error updating script.js:', error.message);
        process.exit(1);
    }
}

// Main execution
console.log('Scanning music directory...');
const musicFiles = getMusicFiles();

if (musicFiles.length === 0) {
    console.log('No music files found in', MUSIC_DIR);
    process.exit(0);
}

updateScriptFile(musicFiles);

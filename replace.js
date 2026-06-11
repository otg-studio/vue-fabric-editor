const fs = require('fs');
const path = require('path');

const dir = 'c:\\work\\scripts\\command\\vue-fabric-editor\\src\\components';

function traverseDir(directory) {
  const files = fs.readdirSync(directory);
  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.vue')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<ColorPicker')) {
        content = content.replace(/<ColorPicker/g, '<ColorPickerDrop');
        content = content.replace(/<\/ColorPicker>/g, '</ColorPickerDrop>');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  });
}

traverseDir(dir);

const helper = process.argv.find(argument => argument.startsWith('--ilbi-update-helper='));
if (process.platform === 'linux' && helper) {
  require('./linux-update-helper.cjs').run(helper.slice('--ilbi-update-helper='.length)).catch(() => require('electron').app.exit(1));
} else require('./application.cjs');

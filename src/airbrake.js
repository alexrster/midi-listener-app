const Airbrake = require('@airbrake/node');

new Airbrake.Notifier({
  projectId: 275209,
  projectKey: '7c8e1863ec0c886fbc4a43759d2dc8a7',
  environment: 'production'
});

module.exports = {
  apps: [{
    name: 'gloopybot',
    cwd: __dirname,
    script: 'src/index.js',
    node_args: '--env-file-if-exists=.env'
  }]
};
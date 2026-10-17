const app = require('./app');

const PORT = Number(process.env.PORT || 3000);

// Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead of throwing.
app.listen(PORT, (error) => {
  if (error) {
    console.error(`Could not start on port ${PORT}: ${error.message}`);
    console.error('Try another port, e.g. in PowerShell: $env:PORT=4000; npm start');
    process.exit(1);
  }

  console.log(`Éclat Media running at http://localhost:${PORT}`);
});

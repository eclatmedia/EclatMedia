const app = require('./admin-upload');

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Éclat Media running at http://localhost:${PORT}`);
});

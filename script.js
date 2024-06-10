const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const pdf = require('html-pdf');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

// Connect to MongoDB
mongoose.connect('mongodb://localhost/GradjevinskaKnjiga', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error connecting to MongoDB:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

// Define the schema and model with explicit collection name
const PodaciSchema = new mongoose.Schema({
  datum: Date,
  imePrezime: String,
  opisRada: String,
  sifra: String,
  brojModela: Number,
  kolicina: Number,
  potpisIzvodjaca: String,
  potpisNadzornogOrgana: String
}, { collection: 'podacis' });

const Podaci = mongoose.model('Podaci', PodaciSchema);

app.use(express.static(path.join(__dirname)));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the izvestaj.html file
app.get('/izvestaj', (req, res) => {
  res.sendFile(path.join(__dirname, 'izvestaj.html'));
});

// Handle form submission
app.post('/unos-podataka', async (req, res) => {
  try {
    const { datum, imePrezime, opisRada, sifra, brojModela, kolicina, potpisIzvodjaca, potpisNadzornogOrgana } = req.body;
    const newPodaci = new Podaci({
      datum,
      imePrezime,
      opisRada,
      sifra,
      brojModela,
      kolicina,
      potpisIzvodjaca,
      potpisNadzornogOrgana
    });
    await newPodaci.save();
    res.send('Data successfully saved to the database.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving data to the database');
  }
});

// Get all data for izvestaj
app.get('/api/podaci', async (req, res) => {
  try {
    const podaci = await Podaci.find({});
    res.json(podaci);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data from the database');
  }
});

// Generate PDF
app.get('/generate-pdf/:id', async (req, res) => {
  try {
    const podaci = await Podaci.findById(req.params.id);
    const html = `
      <h1>Izvestaj</h1>
      <p>Datum: ${new Date(podaci.datum).toLocaleDateString()}</p>
      <p>Ime i prezime: ${podaci.imePrezime}</p>
      <p>Opis rada: ${podaci.opisRada}</p>
      <p>Šifra: ${podaci.sifra}</p>
      <p>Broj modela: ${podaci.brojModela}</p>
      <p>Količina: ${podaci.kolicina}</p>
      <p>Potpis izvođača: ${podaci.potpisIzvodjaca}</p>
      <p>Potpis nadzornog organa: ${podaci.potpisNadzornogOrgana}</p>
    `;
    pdf.create(html).toStream((err, stream) => {
      if (err) return res.status(500).send(err);
      res.setHeader('Content-type', 'application/pdf');
      res.setHeader('Content-disposition', 'attachment; filename=izvestaj.pdf');
      stream.pipe(res);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const app = express();
const userRoutes = require('./src/routes/userRoutes');
const voteRoutes = require('./src/routes/voteRoutes');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', userRoutes);
app.use('/vote', voteRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

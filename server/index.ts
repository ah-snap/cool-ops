// const path = require('path');
import express from 'express';
const app = express();
import {router} from './routes/router.ts';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { runSettingsMigrations } from './resources/settings/migrate.ts';

dotenv.config();
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const PORT = process.env.PORT || 3003;

app.use('/api', router);

app.use(function (req, res) {
	const err = new Error('Not Found')
	err.status = 404
	res.json(err)
});

try {
	await runSettingsMigrations();
} catch (err) {
	console.error('Failed to run settings migrations; settings-backed values will fall back to process.env.', err);
}

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

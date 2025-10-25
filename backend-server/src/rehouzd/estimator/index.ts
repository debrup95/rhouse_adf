import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/property';
import userRouter from './services/userService';
import specialistRouter from './services/specialistService';
import estimateRouter from './services/estimateService';
import runSQLScript from './config/dbInit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Initialize tables on startup
// it will only create table when it is not there so if there is any add it in alter table script
console.log('🚀 Starting app process...');
runSQLScript().then(() => {
  console.log('🚀 Checked the DB');
}).catch((error) => {
  console.error('❌ Failed to check db:', error);
});

app.use('/api/auth', authRoutes);
app.use('/api/property', propertyRoutes);

// app.use('/users', userRouter);
// app.use('/specialist-calls', specialistRouter);
// app.use('/estimates', estimateRouter);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// console.log('🚀 ending startup process...');
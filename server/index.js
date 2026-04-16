// SPEngine API Server
import express from 'express';
import cors from 'cors';
import scenarioRoutes from './routes/scenarios.js';
import presetRoutes from './routes/presets.js';
import universeRoutes from './routes/universe.js';
import settingsRoutes from './routes/settings.js';
import sessionRoutes from './routes/sessions.js';
import fileRoutes from './routes/files.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import log from './logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Bond-Arrays koennen gross sein
app.use(requestLogger);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/presets', presetRoutes);
app.use('/api/universe', universeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/files', fileRoutes);

// Error Handler
app.use(errorHandler);

// Start
app.listen(PORT, () => {
  console.log(`[API] SPEngine API laeuft auf Port ${PORT}`);
  console.log(`[API] Health: http://localhost:${PORT}/api/health`);
});

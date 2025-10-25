import express, { Request, Response } from 'express';
import { saveEstimate, Estimate,  getAllEstimates, 
  getSingleEstimate} from '../models/estimateModel';

const router = express.Router();

//get all estimates
router.get('/', async (req: Request, res: Response) => {
  const estimates = await getAllEstimates();
  if (!estimates || estimates.length === 0) {
    res.status(404).send('No estimates found');
  } else {
    res.status(200).json(estimates);
  }
});

//get single estimates from address_id
router.get('/:id', async (req: Request, res: Response) => {
  const estimateId = parseInt(req.params.id, 10);
  if (isNaN(estimateId)) {
    res.status(400).send('Invalid estimate ID');
    return;
  }

  const estimate = await getSingleEstimate(estimateId);
  if (!estimate) {
    res.status(404).send('Estimate not found');
  } else {
    res.status(200).json(estimate);
  }
});


//Saving the estimates
router.post('/', async (req: Request, res: Response) => {
  try {
    const estimate: Estimate = req.body;
    await saveEstimate(estimate);
    res.status(201).send('Estimate saved successfully');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Failed to save estimate');
  }
});




export default router;

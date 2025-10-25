import express, { Request, Response } from 'express';
import { saveSpecialistCall, SpecialistCall, getAllSpecialistCallsWithUser, getDistinctSpecialistCalls  } from '../models/specialistModel';
import { checkAndUpdateMobileNumber, getUserEmailById  } from '../models/userModel';
import { sendEmail } from '../utils/emailService';

const router = express.Router();


//get all estimates
router.get('/', async (req: Request, res: Response) => {
  const calls = await getAllSpecialistCallsWithUser();
  if (!calls || calls.length === 0) {
    res.status(404).send('No estimates found');
  } else {
    res.status(200).json(calls);
  }
});

router.get('/latest', async (req: Request, res: Response) => {
  const calls = await getDistinctSpecialistCalls();
  if (!calls || calls.length === 0) {
    res.status(404).send('No estimates found');
  } else {
    res.status(200).json(calls);
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const call: SpecialistCall = req.body;
    if(!call.user_id || !call.mobile_number) {
      res.status(400).json({ message: 'user_id and mobile_number are required' });
    } else {
      // ✅ Check and update mobile number separately
      await checkAndUpdateMobileNumber(call.user_id, call.mobile_number);

      await saveSpecialistCall(call);

      // ✅ Get user email
      // const email = await getUserEmailById(call.user_id);

      // if (email) {
      //   // ✅ Send email notification
      //   await sendEmail(
      //     email,
      //     'Specialist Call Request Confirmation',
      //     `Your specialist call back request successfully received.`
      //   );
      // }

      res.status(201).json('Specialist call saved successfully');
    }
  } catch (error : any) {
    console.error('❌ Error:', error.message);
    res.status(500).send(`❌ Failed to save specialist call: ${error.message}`);
  }
});





export default router;

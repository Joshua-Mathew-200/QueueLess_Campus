const express = require("express");

const {
  requireAuth,
  requireStudent,
  requireStaff,
} = require("../middleware/auth");

const {
  getQueueStatus,
  setAdmission,
  joinQueue,
  callNext,
  resolveToken,
  cancelToken,
  getMyHistory,
  getDailyStats,
  getWaitingList,
} = require("../controllers/queueController");

const router = express.Router();

router.use(requireAuth);

router.get("/status", getQueueStatus);

router.patch("/admission", requireStaff, setAdmission);

router.post("/join", requireStudent, joinQueue);

router.post("/next", requireStaff, callNext);

router.patch("/resolve", requireStaff, resolveToken);

router.patch("/cancel", requireStudent, cancelToken);

router.get("/history", requireStudent, getMyHistory);

router.get("/stats", requireStaff, getDailyStats);

router.get("/waiting", requireStaff, getWaitingList);
module.exports = router;
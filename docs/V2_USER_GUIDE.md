# V2 User Guide

1. Open the workbench and set TOEFL/GRE targets and available minutes. For active exams, enter a TOEFL target from 1 to 6 or a GRE target from 260 to 340, with daily minutes greater than zero. Use **设置 → 保存设置** to change these later; the saved targets update Today's Prescription and the dashboard together while retaining baseline scores and checkpoints.
2. Use **诊断与模考** to enter a baseline or checkpoint. Keep official, manual and estimated sources distinct.
3. Record practice by question type and skill. Record incorrect items in the Error Lab with a typed error reason.
4. Start with **Today's Prescription**. Each block shows its minutes and the reason it was selected.
5. Retry due errors. A skill improves only when retry data and fresh attempts support it.
6. Add recurring GRE words to Vocabulary Review; correct answers increase the interval, incorrect answers reset it.
7. Use Weakness Map to inspect priority, mastery, unresolved errors and recent accuracy.
8. Export JSON regularly. Learning backups and the Question Bank are exported/imported separately. A learning-backup import is validated and migrated, then asks for **确认替换** before replacing current learning records.

When **正在核对题库引用** appears, the app is checking saved question attempts against the Question Bank. The related history is retained and temporarily excluded from mastery and priority evidence. If **缺少题库记录** appears, import the corresponding bank on the Question Bank page; the app automatically rechecks the references. If checking fails, use **重新核对题库**. Standalone source-reference records and batch summaries can still contribute without a stored full-question row. When a saved reference does match a bank record with a disputed question or answer, its history remains available but is excluded from learning evidence.

If saved data needs recovery, the app shows an **原始学习数据** notice, including on the first-setup screen. Use **下载原始恢复数据** to save the original payload as `study-atelier-recovery.json` before making further changes. The first original recovery backup remains available after later successful loads and subsequent recovery events until you explicitly clear the data. **清空所有数据** removes that backup along with the learning records, so download anything you need first.

import { Router, Request, Response } from "express";
import { exec } from "child_process";
import path from "path";

const router = Router();

// Đường dẫn tới thư mục chứa script Python (cần điều chỉnh khi deploy)
const SCRIPT_DIR = path.resolve(__dirname, '../../../scripts');

router.post("/fund-tools", async (req: Request, res: Response) => {
  try {
    const { hosts, limit } = req.body;
    
    if (!hosts || !Array.isArray(hosts)) {
      return res.status(400).json({ success: false, error: "Thiếu danh sách host" });
    }

    // Gọi script Python gộp (giả định tên file là run_fund_tools.py)
    // Command: python3 run_fund_tools.py --hosts "id1,id2" --limit 5
    const hostString = hosts.join(',');
    const command = `python3 ${path.join(SCRIPT_DIR, 'run_fund_tools.py')} --hosts "${hostString}" --limit ${limit || 5}`;

    console.log('Executing:', command);

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ 
          success: false, 
          error: stderr || error.message 
        });
      }

      try {
        // Giả sử script Python trả về JSON
        const result = JSON.parse(stdout);
        res.json({ success: true, results: result });
      } catch (e) {
        // Nếu không phải JSON, trả về raw text
        res.json({ success: true, results: [{ status: 'success', message: stdout }] });
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Loi xu ly yeu cau"
    });
  }
});

export default router;

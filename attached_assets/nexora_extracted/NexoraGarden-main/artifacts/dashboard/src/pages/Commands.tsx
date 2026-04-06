import { useEffect, useState } from "react";
import { api, type Command } from "@/lib/api";
import {
  Plus, Pencil, Trash2, Save, X, Terminal,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
      type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    }`}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

interface FormData {
  name: string;
  command: string;
  description: string;
}

function CommandRow({
  cmd, onEdit, onDelete,
}: {
  cmd: Command;
  onEdit: (cmd: Command) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className={`p-2 rounded-lg flex-shrink-0 ${cmd.is_builtin ? "bg-emerald-100" : "bg-purple-100"}`}>
          <Terminal className={`w-4 h-4 ${cmd.is_builtin ? "text-emerald-600" : "text-purple-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{cmd.name}</span>
            {cmd.is_builtin ? (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Built-in</span>
            ) : (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Tùy chỉnh</span>
            )}
          </div>
          <code className="text-xs text-gray-500 font-mono">{cmd.command}</code>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <p className="text-sm text-gray-600 mt-3">{cmd.description || "Không có mô tả"}</p>
          {!cmd.is_builtin && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onEdit(cmd)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Chỉnh sửa
              </button>
              <button
                onClick={() => onDelete(cmd.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Commands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", command: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCommands = async () => {
    setLoading(true);
    try {
      const cmds = await api.getCommands();
      setCommands(cmds);
    } catch (err: any) {
      showToast(err.message ?? "Không thể tải danh sách lệnh", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const handleEdit = (cmd: Command) => {
    setEditingId(cmd.id);
    setForm({ name: cmd.name, command: cmd.command, description: cmd.description });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa lệnh này?")) return;
    try {
      await api.deleteCommand(id);
      showToast("Đã xóa lệnh", "success");
      fetchCommands();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.command.trim()) {
      showToast("Tên và lệnh không được để trống", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCommand(editingId, form);
        showToast("Đã cập nhật lệnh", "success");
      } else {
        await api.addCommand(form);
        showToast("Đã thêm lệnh mới", "success");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: "", command: "", description: "" });
      fetchCommands();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const builtins = commands.filter((c) => c.is_builtin);
  const custom = commands.filter((c) => !c.is_builtin);

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-gray-800">Danh sách lệnh</h2>
          <p className="text-sm text-muted-foreground">{commands.length} lệnh tổng cộng</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({ name: "", command: "", description: "" });
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm lệnh
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-primary/30 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {editingId ? "Chỉnh sửa lệnh" : "Thêm lệnh mới"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tên hiển thị *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Bật đèn vườn"
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Lệnh Telegram *</label>
              <input
                type="text"
                value={form.command}
                onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                placeholder="VD: /light_on"
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Mô tả ngắn về tác dụng của lệnh này..."
                rows={2}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
      )}

      {/* Built-in commands */}
      {builtins.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Lệnh mặc định ({builtins.length})
          </h3>
          {builtins.map((cmd) => (
            <CommandRow key={cmd.id} cmd={cmd} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Custom commands */}
      {custom.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Lệnh tùy chỉnh ({custom.length})
          </h3>
          {custom.map((cmd) => (
            <CommandRow key={cmd.id} cmd={cmd} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {custom.length === 0 && !loading && (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <Terminal className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Chưa có lệnh tùy chỉnh nào</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn "Thêm lệnh" để tạo lệnh mới</p>
        </div>
      )}
    </div>
  );
}

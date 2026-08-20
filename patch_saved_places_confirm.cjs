const fs = require('fs');

let viewCode = fs.readFileSync('views/SavedPlaces.tsx', 'utf8');

// 1. Add state for delete confirmation
viewCode = viewCode.replace(
  /const \[isEditModalOpen, setIsEditModalOpen\] = useState\(false\);/,
  `const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);`
);

// 2. Change handleDelete to not use window.confirm
const handleDeleteReplace = `  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      const updated = savedLocations.map(p => 
        p.id === id ? { ...p, isDeleted: true } : p
      );
      setSavedLocations(updated);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };`;
viewCode = viewCode.replace(/  const handleDelete = async \(id: string\) => \{[\s\S]*?  \};/, handleDeleteReplace);

// 3. Change the button onClick
viewCode = viewCode.replace(
  /onClick=\{\(\) => handleDelete\(place\.id\)\}/,
  `onClick={() => setDeleteConfirmId(place.id)}`
);

// 4. Add the Delete Confirm Modal before the final </div>
const deleteModalCode = `
      {/* Delete Confirm Modal (Admin Only) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                এই লোকেশনটি ডিলিট করলে তা চিরতরে মুছে যাবে এবং কেউ এটি আর দেখতে পারবে না।
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}`;
viewCode = viewCode.replace(/    <\/div>\n  \);\n\}/, deleteModalCode);

fs.writeFileSync('views/SavedPlaces.tsx', viewCode);

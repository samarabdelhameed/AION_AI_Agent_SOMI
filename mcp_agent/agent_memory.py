from membase.memory.multi_memory import MultiMemory
from membase.memory.message import Message
from membase.knowledge.chroma import ChromaKnowledgeBase
from membase.knowledge.document import Document
import json
import os
import sys
from datetime import datetime, timezone   # ✅ أضفنا timezone

# 🧠 إعداد MultiMemory لتخزين الذاكرة في Unibase
mm = MultiMemory(
    membase_account="default",
    auto_upload_to_hub=True,
    preload_from_hub=True
)

# 📚 إعداد Knowledge Base لحفظ المعرفة المستخلصة
kb = ChromaKnowledgeBase(
    persist_directory="/tmp/ainon_kb", 
    membase_account="default",
    auto_upload_to_hub=True
)

# 🔄 تحميل memory.json لو موجود
MEMORY_JSON_PATH = "./memory.json"

if os.path.exists(MEMORY_JSON_PATH):
    with open(MEMORY_JSON_PATH, "r") as f:
        local_memory = json.load(f)
else:
    local_memory = {}

# 🧠 تسجيل الذاكرة + 📚 تسجيل المعرفة
def save_to_membase(wallet, action, strategy, amount):
    # 1️⃣ حفظ في Unibase memory
    msg = Message(
        name="AinonAgent",
        content=f"User performed {action} of {amount} BNB with strategy {strategy}",
        role="assistant",
        metadata={
            "wallet": wallet,
            "strategy": strategy,
            "amount": amount,
            "last_action": action.lower()  # ✅ أفضل تكون lowercase للعرض في الـ Table
        }
    )
    mm.add(msg, wallet)

    # 2️⃣ حفظ في قاعدة المعرفة
    doc = Document(
        content=f"Executed {strategy} strategy via {action} of {amount} BNB",
        metadata={"wallet": wallet, "action": action, "source": "AinonAgent"}
    )
    kb.add_documents(doc)

    # 3️⃣ تحديث memory.json (local)
    event = {
        "content": msg.content,
        "role": msg.role,
        "metadata": msg.metadata,
        "created_at": getattr(
            msg,
            'created_at',
            datetime.now(timezone.utc).isoformat()
        )
    }

    if wallet not in local_memory:
        local_memory[wallet] = []

    local_memory[wallet].append(event)

    with open(MEMORY_JSON_PATH, "w") as f:
        json.dump(local_memory, f, indent=2)

    print("✅ Memory & Knowledge saved successfully.")
    print(f"✅ Local memory updated for wallet {wallet}.")

# 🏁 تشغيل مباشر لو تم استدعاء السكربت من Node.js أو من CLI
if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python3 agent_memory.py <wallet> <action> <strategy> <amount>")
        sys.exit(1)

    wallet = sys.argv[1]
    action = sys.argv[2]
    strategy = sys.argv[3]
    amount = sys.argv[4]

    save_to_membase(wallet, action, strategy, amount)

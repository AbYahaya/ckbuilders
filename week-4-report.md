## 🗓 Week 4 — Transactions & Scripting on CKB

### 📚 Courses / Lessons Completed

* **L1 Developer Course — Continued** 
* **CKB Transactions (Theory & Practical)** 
* **CKB Scripting (Lock & Type Scripts)** 
* **Capsule Framework Introduction** 

---

### 🧠 Key Topics Covered

#### CKB Fundamentals (Deeper Understanding)

* Reinforced understanding of CKB architecture
* Improved mental model of how components interact on-chain

#### Transactions

* Structure of CKB transactions:

  * Inputs, Outputs, CellDeps, HeaderDeps, Witnesses
* Cell-based (UTXO-like) model in practice
* Practical execution of transactions
* Understanding how data flows from off-chain → on-chain

#### Off-Chain Logic (Lumos)

* Introduction to the **Lumos framework**
* Building and structuring transactions off-chain
* Role of indexers and transaction builders
* Insight into how off-chain logic prepares data for on-chain validation
* Understanding limitations and why newer approaches (e.g., CCC) are emerging

#### CKB Scripting (Smart Contracts)

* Deep dive into:

  * **Lock Scripts** (ownership & authorization)
  * **Type Scripts** (state validation & rules)
* Script arguments (`args`) and their role in configuration
* **HashTypes**:

  * `data`
  * `type`
  * `data1`
* Understanding script identification and execution

#### Script Upgradeability

* Differences between hash types in enabling upgradeable logic
* Role of **Type ID** in safe contract upgrades

#### Always Success Script

* Explored the **always success** script example
* Understood its purpose as a minimal validation script
* Successfully ran and tested the practical implementation

#### Capsule Framework

* Introduction to **Capsule** for CKB smart contract development
* Project structure and workflow
* Preparing environment for writing on-chain scripts in Rust

---

### 🛠 Practical Work Completed

* Executed and analyzed real **CKB transactions**
* Used **Lumos** to understand off-chain transaction building
* Explored and ran the **always success script**
* Set up and began working with the **Capsule framework**
* Investigated script structures and configurations in real scenarios

---

### 📊 Progress Status

* Transactions Module: Completed
* Scripting Fundamentals: Completed
* Always Success Practical: Completed
* Capsule Setup: Completed

---

### 💡 Key Learnings

* Developed a clear understanding of how **CKB transactions are structured and executed**
* Learned how **off-chain logic (Lumos)** prepares and constructs transactions before submission
* Understood that CKB scripts are **validation logic, not execution logic**, reinforcing the verification-based model
* Gained deep insight into **lock vs type scripts** and their distinct responsibilities
* Learned how **script arguments (`args`) act as configuration inputs** for smart contracts
* Understood how **hash types and Type ID influence upgradeability and script behavior**
* Built foundational knowledge required to start writing real smart contracts using Capsule

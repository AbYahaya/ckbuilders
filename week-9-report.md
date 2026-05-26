## Week 9 — Agreement Registry v2 + Metadata + Viewer Updates

### Courses / Lessons Completed

* None this week

---

### Key Topics Covered

#### Agreement Version v2 (Chaining)

* Publish v2 agreement with prev out-point support
* Auto-resolve previous version out-point when not provided

#### Acceptance Metadata

* Allow optional per-user metadata appended to acceptance data
* Enable batch acceptances with unique metadata per output

#### Viewer Improvements

* Version selector backed by a JSON registry
* Optional explorer links for tx hashes

#### Deployment + Indexer Dependency

* CCC flows depend on a running CKB indexer for `get_cells`
* Local devnet was running without an indexer, blocking redeploy/tests

---

### Practical Work Completed

* Implemented v2 agreement chaining support in CCC flow
* Added acceptance metadata support for single + batch flows
* Relaxed acceptance type script data length checks to allow metadata
* Added v2 agreement text and version registry JSON for viewer
* Improved viewer UI with version selector + explorer links

---

### Issues Encountered (Why They Came Up)

* **Missing local indexer**: The offckb devnet starts RPC, but no indexer was running, so CCC `get_cells` failed.
* **Install blockers**: Attempted to install `ckb-indexer` from source failed due to RocksDB build errors, and the prebuilt binary requires `libssl1.1` which is not present.

This is why deployment/testing suddenly failed even though previous weeks succeeded — earlier environments had a working indexer available, but this local setup does not.

---

### Progress Status

* Code changes for v2 chaining, metadata, and viewer updates are done
* Redeploy + test pending indexer installation or remote indexer access

---

### Key Learnings

* CCC client flows require an indexer (not just CKB RPC)
* Local devnet needs explicit indexer setup to support `get_cells`

---

### Next

* Install or connect to a working CKB indexer
* Redeploy agreement scripts and update CCC `.env` hashes
* Run v1 + v2 publish, batch acceptances, and viewer
* Capture screenshots for report

---

## 📸 Reference Images

(After redeploy/testing)

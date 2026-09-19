"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Mock Blockchain Audit Log

Implements an append-only, SHA-256 chained cryptographic ledger.
Every surveillance alert is sealed into a tamper-proof block
linking to the previous block's hash.
"""

import hashlib
import json
import time
import os
from typing import List, Dict, Any, Optional

LEDGER_FILE_PATH = "blockchain_audit.log"


class Block:
    def __init__(
        self,
        index: int,
        prev_hash: str,
        timestamp: str,
        event_data: Dict[str, Any],
        nonce: int = 0
    ):
        self.index = index
        self.prev_hash = prev_hash
        self.timestamp = timestamp
        self.event_data = event_data
        self.nonce = nonce
        self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        """Computes SHA-256 hash over block headers and serialized event payload."""
        block_string = (
            f"{self.index}|"
            f"{self.prev_hash}|"
            f"{self.timestamp}|"
            f"{json.dumps(self.event_data, sort_keys=True)}|"
            f"{self.nonce}"
        )
        return hashlib.sha256(block_string.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
            "event_data": self.event_data,
            "nonce": self.nonce,
            "hash": self.hash
        }


class BlockchainLedger:
    def __init__(self, log_file: str = LEDGER_FILE_PATH):
        self.log_file = log_file
        self.chain: List[Block] = []
        self._initialize_or_load()

    def _initialize_or_load(self):
        """Loads existing chain from disk or creates genesis block."""
        if os.path.exists(self.log_file):
            try:
                loaded_chain = []
                with open(self.log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            data = json.loads(line)
                            block = Block(
                                index=data["index"],
                                prev_hash=data["prev_hash"],
                                timestamp=data["timestamp"],
                                event_data=data["event_data"],
                                nonce=data.get("nonce", 0)
                            )
                            # Preserve recorded hash for tamper detection testing
                            block.hash = data["hash"]
                            loaded_chain.append(block)
                if loaded_chain:
                    self.chain = loaded_chain
                    return
            except Exception as e:
                print(f"[BlockchainLedger] Warning reading log file: {e}. Reinitializing.")

        # Create Genesis Block
        genesis = Block(
            index=0,
            prev_hash="0" * 64,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
            event_data={
                "system": "SENTINEL-AI",
                "message": "Genesis Block - Border Surveillance Immutable Ledger Initialized",
                "sector": "Sector 4-Alpha Perimeter"
            },
            nonce=1337
        )
        self.chain = [genesis]
        self._append_to_disk(genesis)

    def append_event(self, event_data: Dict[str, Any]) -> Block:
        """Appends a new alert/event to the blockchain and persists to disk."""
        last_block = self.chain[-1]
        timestamp = time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())
        new_block = Block(
            index=len(self.chain),
            prev_hash=last_block.hash,
            timestamp=timestamp,
            event_data=event_data,
            nonce=0
        )
        self.chain.append(new_block)
        self._append_to_disk(new_block)
        return new_block

    def _append_to_disk(self, block: Block):
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(block.to_dict()) + "\n")

    def verify_chain(self) -> Dict[str, Any]:
        """
        Validates hash chain integrity.
        Returns whether the chain is valid or where tampering occurred.
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            prev = self.chain[i - 1]

            # Check previous hash link
            if current.prev_hash != prev.hash:
                return {
                    "is_valid": False,
                    "tamper_index": i,
                    "reason": f"Broken link at block #{i}: prev_hash does not match block #{i-1} hash."
                }

            # Check cryptographic integrity of current block
            computed_hash = current.calculate_hash()
            if current.hash != computed_hash:
                return {
                    "is_valid": False,
                    "tamper_index": i,
                    "reason": f"Hash mismatch at block #{i}: block data was altered post-creation!"
                }

        return {
            "is_valid": True,
            "total_blocks": len(self.chain),
            "latest_hash": self.chain[-1].hash if self.chain else None,
            "reason": "Cryptographic integrity verified. 0 tampering detected."
        }

    def get_all_blocks(self) -> List[Dict[str, Any]]:
        return [b.to_dict() for b in self.chain]

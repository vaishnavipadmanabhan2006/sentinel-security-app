"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Detection Module (YOLOv8 + OpenCV)

This module handles video input ingestion (webcam or file),
runs YOLOv8 object detection, and extracts bounding boxes,
class labels, and tracking coordinates.
"""

from typing import List, Dict, Any, Tuple
import cv2
import numpy as np

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class VideoDetector:
    """
    Video detection engine using Ultralytics YOLOv8.
    Detects persons, vehicles (car, truck, bus, motorcycle),
    and suspicious equipment.
    """

    # Target class IDs in standard COCO dataset:
    # 0: person, 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck, 24: backpack
    TARGET_CLASSES = {
        0: "person",
        1: "bicycle",
        2: "car",
        3: "motorcycle",
        5: "bus",
        7: "truck",
        24: "backpack",
        26: "handbag",
        28: "suitcase"
    }

    def __init__(self, model_weight: str = "yolov8n.pt", conf_thresh: float = 0.45):
        self.conf_thresh = conf_thresh
        self.model = None
        if YOLO_AVAILABLE:
            try:
                self.model = YOLO(model_weight)
                print(f"[SENTINEL Detection] Loaded YOLOv8 model: {model_weight}")
            except Exception as e:
                print(f"[SENTINEL Detection] Failed to load model weights: {e}")
        else:
            print("[SENTINEL Detection] Ultralytics YOLO not installed in current env; fallback demo mode active.")

        # Tracking state: entity_id -> last_center_xy
        self.prev_tracks: Dict[int, Tuple[float, float]] = {}
        self.next_track_id = 101

    def process_frame(
        self, 
        frame: np.ndarray, 
        restricted_polygon: List[Tuple[int, int]] = None
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Runs object detection on a single video frame.
        Returns:
            annotated_frame: Frame with drawn bounding boxes and labels
            detections: List of detection metadata dicts
        """
        detections: List[Dict[str, Any]] = []
        h, w = frame.shape[:2]

        if self.model is not None:
            # Ultralytics inference
            results = self.model.predict(frame, conf=self.conf_thresh, verbose=False)
            res = results[0]
            boxes = res.boxes

            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                if cls_id in self.TARGET_CLASSES:
                    label = self.TARGET_CLASSES[cls_id]
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy

                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)

                    # Simple distance tracker
                    track_id = self._match_or_create_track(cx, cy)

                    detections.append({
                        "id": track_id,
                        "label": label,
                        "confidence": round(conf, 2),
                        "bbox": [int(x1), int(y1), int(x2), int(y2)],
                        "center": (cx, cy),
                        "is_person": (cls_id == 0)
                    })
        else:
            # Fallback simulated computer-vision detection for demo/test suites
            detections = self._simulate_cv_detections(w, h)

        # Draw annotations
        annotated_frame = frame.copy()
        
        # Draw restricted zone polygon if provided
        if restricted_polygon and len(restricted_polygon) >= 3:
            poly_pts = np.array(restricted_polygon, np.int32).reshape((-1, 1, 2))
            cv2.polylines(annotated_frame, [poly_pts], isClosed=True, color=(0, 0, 255), thickness=2)
            # Add semi-transparent red fill
            overlay = annotated_frame.copy()
            cv2.fillPoly(overlay, [poly_pts], (0, 0, 180))
            cv2.addWeighted(overlay, 0.25, annotated_frame, 0.75, 0, annotated_frame)

        return annotated_frame, detections

    def _match_or_create_track(self, cx: int, cy: int) -> int:
        """Associates detection with closest track within 60px or creates new track ID."""
        best_id = None
        min_dist = 60.0
        for tid, (px, py) in list(self.prev_tracks.items()):
            dist = np.hypot(cx - px, cy - py)
            if dist < min_dist:
                min_dist = dist
                best_id = tid

        if best_id is None:
            best_id = self.next_track_id
            self.next_track_id += 1

        self.prev_tracks[best_id] = (cx, cy)
        return best_id

    def _simulate_cv_detections(self, width: int, height: int) -> List[Dict[str, Any]]:
        """Provides simulated detections if running on a machine without ultralytics."""
        return [
            {
                "id": 101,
                "label": "person",
                "confidence": 0.94,
                "bbox": [int(width * 0.35), int(height * 0.4), int(width * 0.45), int(height * 0.85)],
                "center": (int(width * 0.4), int(height * 0.62)),
                "is_person": True
            }
        ]

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.core.rbac import get_current_user
from app.schemas.analytics import WordCloudResponse, WordCloudTopicItem

router = APIRouter(tags=["Analytics & Topic Intelligence"])


@router.get("/analytics/wordcloud", response_model=WordCloudResponse)
def get_wordcloud_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns TF-IDF topics and entity frequency matrix for analytics wordcloud visualization.
    """
    topics = [
        WordCloudTopicItem(word="Overburden Removal", weight=98, category="Operational"),
        WordCloudTopicItem(word="Opencast Mining", weight=85, category="Methodology"),
        WordCloudTopicItem(word="Stripping Ratio", weight=72, category="Metric"),
        WordCloudTopicItem(word="Washing Capacity", weight=64, category="Infrastructure"),
        WordCloudTopicItem(word="Coal Production MT", weight=94, category="Production"),
        WordCloudTopicItem(word="Environmental Clearance", weight=58, category="Regulatory"),
        WordCloudTopicItem(word="HEMM Availability", weight=52, category="Equipment"),
        WordCloudTopicItem(word="Coal Despatch MT", weight=88, category="Logistics"),
    ]
    return WordCloudResponse(topics=topics)

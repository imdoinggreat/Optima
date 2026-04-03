from app.db.session import engine, Base
from app.db import models  # 确保导入了所有模型

def init_database():
    print("🗄️  正在创建数据库表...")
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建成功！")

if __name__ == "__main__":
    init_database()
from typing import Optional, List, Any
from langchain.schema import Document
from langchain_community.vectorstores import Chroma, FAISS
from app.core.config import settings
from app.rag.llm_provider import get_embeddings
import os

# Disable ChromaDB telemetry
os.environ["ANONYMIZED_TELEMETRY"] = "False"


class VectorStoreFactory:
    """Factory class to create vector database instances based on configuration."""
    
    @staticmethod
    def create_vector_store(
        documents: Optional[List[Document]] = None,
        persist_directory: Optional[str] = None
    ) -> Any:
        """
        Create a vector store instance based on the configured provider.
        
        Args:
            documents: Optional list of documents to initialize the store
            persist_directory: Directory to persist the vector store (for Chroma)
            
        Returns:
            Vector store instance (Chroma or FAISS)
            
        Raises:
            ValueError: If vector DB type is not supported
        """
        vector_db_type = settings.VECTOR_DB_TYPE.lower()
        embeddings = get_embeddings()
        
        if vector_db_type == "chroma":
            persist_dir = persist_directory or settings.CHROMA_PERSIST_DIR
            
            if documents:
                # Create new Chroma store with documents (in-memory for now)
                return Chroma.from_documents(
                    documents=documents,
                    embedding=embeddings
                )
            else:
                # Load existing Chroma store (in-memory for now)
                try:
                    return Chroma(
                        embedding_function=embeddings
                    )
                except Exception as e:
                    # If loading fails, return None to indicate need for initialization
                    logger.warning(f"Could not load existing Chroma store: {str(e)}")
                    raise
        
        elif vector_db_type == "faiss":
            if documents:
                # Create new FAISS store with documents
                return FAISS.from_documents(
                    documents=documents,
                    embedding=embeddings
                )
            else:
                raise ValueError(
                    "FAISS requires documents to initialize. "
                    "For loading existing FAISS index, use FAISS.load_local() directly."
                )
        
        else:
            raise ValueError(
                f"Unsupported vector database type: {vector_db_type}. "
                "Supported types are: 'chroma', 'faiss'"
            )
    
    @staticmethod
    def get_retriever(
        vector_store: Any,
        search_type: str = "similarity",
        search_kwargs: Optional[dict] = None
    ) -> Any:
        """
        Get a retriever from the vector store.
        
        Args:
            vector_store: The vector store instance
            search_type: Type of search ('similarity', 'mmr', 'similarity_score_threshold')
            search_kwargs: Additional search parameters
            
        Returns:
            Retriever instance
        """
        search_kwargs = search_kwargs or {"k": 4}
        return vector_store.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs
        )


def get_vector_store(
    documents: Optional[List[Document]] = None,
    persist_directory: Optional[str] = None
) -> Any:
    """
    Convenience function to get a vector store instance.
    
    Args:
        documents: Optional list of documents to initialize the store
        persist_directory: Directory to persist the vector store (for Chroma)
        
    Returns:
        Vector store instance
    """
    return VectorStoreFactory.create_vector_store(documents, persist_directory)


def get_retriever(
    vector_store: Any,
    search_type: str = "similarity",
    search_kwargs: Optional[dict] = None
) -> Any:
    """
    Convenience function to get a retriever from the vector store.
    
    Args:
        vector_store: The vector store instance
        search_type: Type of search
        search_kwargs: Additional search parameters
        
    Returns:
        Retriever instance
    """
    return VectorStoreFactory.get_retriever(vector_store, search_type, search_kwargs)

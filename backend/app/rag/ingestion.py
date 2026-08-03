from typing import Optional, List
from pathlib import Path
from langchain.schema import Document
from app.rag.document_loader import load_directory
from app.rag.text_splitter import split_documents
from app.rag.vector_store import get_vector_store
from app.core.config import settings
from app.core.logging import logger
import os


class DocumentIngestionPipeline:
    """Pipeline for ingesting documents into the vector database."""
    
    def __init__(
        self,
        knowledge_base_path: Optional[str] = None,
        persist_directory: Optional[str] = None
    ):
        """
        Initialize the ingestion pipeline.
        
        Args:
            knowledge_base_path: Path to the knowledge base directory
            persist_directory: Directory to persist the vector store
        """
        # Default knowledge base path relative to project root
        if knowledge_base_path is None:
            project_root = Path(__file__).parent.parent.parent.parent
            knowledge_base_path = str(project_root / "data" / "knowledge_base")
        
        self.knowledge_base_path = knowledge_base_path
        self.persist_directory = persist_directory or settings.CHROMA_PERSIST_DIR
        
        logger.info(
            f"Initialized ingestion pipeline with knowledge base: {knowledge_base_path}"
        )
    
    def ingest_documents(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        force_refresh: bool = False
    ) -> int:
        """
        Load, split, and ingest documents into the vector database.
        
        Args:
            chunk_size: Maximum size of text chunks
            chunk_overlap: Overlap between chunks
            force_refresh: Whether to force refresh existing vector store
            
        Returns:
            Number of documents ingested
        """
        try:
            # Step 1: Load documents from knowledge base
            logger.info(f"Loading documents from: {self.knowledge_base_path}")
            documents = load_directory(self.knowledge_base_path)
            
            if not documents:
                logger.warning("No documents found in knowledge base")
                return 0
            
            # Step 2: Split documents into chunks
            logger.info("Splitting documents into chunks")
            split_docs = split_documents(documents, chunk_size, chunk_overlap)
            
            # Step 3: Create or load vector store
            logger.info("Creating/updating vector store")
            
            if force_refresh:
                # Create new vector store
                vector_store = get_vector_store(
                    documents=split_docs
                )
            else:
                # Try to load existing vector store, create if doesn't exist
                try:
                    vector_store = get_vector_store()
                    # Add new documents to existing store
                    vector_store.add_documents(split_docs)
                except Exception:
                    # If loading fails, create new store
                    vector_store = get_vector_store(
                        documents=split_docs
                    )
            
            logger.info(f"Successfully ingested {len(split_docs)} document chunks")
            
            return len(split_docs)
            
        except Exception as e:
            logger.error(f"Document ingestion failed: {str(e)}")
            raise
    
    def get_vector_store(self):
        """
        Get the current vector store.
        
        Returns:
            Vector store instance
        """
        return get_vector_store()
    
    def clear_vector_store(self):
        """
        Clear the existing vector store (clears in-memory store by recreating).
        
        Note: For in-memory ChromaDB, this just means the global store will be recreated on next access.
        """
        logger.info("Vector store clear requested (in-memory store will be recreated on next access)")
        # For in-memory store, we just need to reset the global chain/vector store
        # This will trigger recreation on next access


def ingest_documents(
    knowledge_base_path: Optional[str] = None,
    persist_directory: Optional[str] = None,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
    force_refresh: bool = False
) -> int:
    """
    Convenience function to ingest documents.
    
    Args:
        knowledge_base_path: Path to the knowledge base directory
        persist_directory: Directory to persist the vector store
        chunk_size: Maximum size of text chunks
        chunk_overlap: Overlap between chunks
        force_refresh: Whether to force refresh existing vector store
        
    Returns:
        Number of documents ingested
    """
    pipeline = DocumentIngestionPipeline(knowledge_base_path, persist_directory)
    return pipeline.ingest_documents(chunk_size, chunk_overlap, force_refresh)

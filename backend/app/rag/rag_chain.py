from typing import Optional, Dict, Any
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from app.rag.llm_provider import get_chat_llm
from app.rag.vector_store import get_retriever
from app.core.logging import logger


class RAGChainFactory:
    """Factory class to create RAG chains for question answering."""
    
    @staticmethod
    def create_default_prompt() -> PromptTemplate:
        """
        Create a default prompt template for RAG.
        
        Returns:
            PromptTemplate instance
        """
        template = """You are CampusGenie AI, an AI-powered academic assistant for university students. 
Use the following pieces of context to answer the question at the end. 
If you don't know the answer based on the context, say that you don't know and suggest checking official university resources.
Keep your answers concise, accurate, and helpful for students.

Context:
{context}

Question: {question}

Answer:"""
        
        return PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
    
    @staticmethod
    def create_rag_chain(
        vector_store: Any,
        llm: Optional[Any] = None,
        prompt_template: Optional[PromptTemplate] = None,
        return_source_documents: bool = True,
        chain_type: str = "stuff"
    ) -> Any:
        """
        Create a RAG chain for question answering.
        
        Args:
            vector_store: The vector store to retrieve from
            llm: Optional custom LLM instance
            prompt_template: Optional custom prompt template
            return_source_documents: Whether to return source documents
            chain_type: Type of chain to use ('stuff', 'map_reduce', 'refine', 'map_rerank')
            
        Returns:
            RetrievalQA chain instance
        """
        # Get default LLM if not provided
        if llm is None:
            llm = get_chat_llm(temperature=0.7)
        
        # Get retriever from vector store
        retriever = get_retriever(vector_store, search_kwargs={"k": 4})
        
        # Get default prompt if not provided
        if prompt_template is None:
            prompt_template = RAGChainFactory.create_default_prompt()
        
        # Create the RAG chain
        chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type=chain_type,
            retriever=retriever,
            return_source_documents=return_source_documents,
            chain_type_kwargs={"prompt": prompt_template}
        )
        
        logger.info("Created RAG chain successfully")
        
        return chain
    
    @staticmethod
    def query_rag_chain(
        chain: Any,
        question: str
    ) -> Dict[str, Any]:
        """
        Query the RAG chain with a question.
        
        Args:
            chain: The RAG chain instance
            question: The question to ask
            
        Returns:
            Dictionary with answer and source documents
        """
        try:
            result = chain({"query": question})
            
            response = {
                "question": question,
                "answer": result.get("result", ""),
                "source_documents": result.get("source_documents", [])
            }
            
            logger.info(f"RAG query processed successfully: {question[:50]}...")
            
            return response
            
        except Exception as e:
            logger.error(f"RAG query failed: {str(e)}")
            raise


def create_rag_chain(
    vector_store: Any,
    llm: Optional[Any] = None,
    prompt_template: Optional[PromptTemplate] = None,
    return_source_documents: bool = True,
    chain_type: str = "stuff"
) -> Any:
    """
    Convenience function to create a RAG chain.
    
    Args:
        vector_store: The vector store to retrieve from
        llm: Optional custom LLM instance
        prompt_template: Optional custom prompt template
        return_source_documents: Whether to return source documents
        chain_type: Type of chain to use
        
    Returns:
        RetrievalQA chain instance
    """
    return RAGChainFactory.create_rag_chain(
        vector_store, llm, prompt_template, return_source_documents, chain_type
    )


def query_rag_chain(
    chain: Any,
    question: str
) -> Dict[str, Any]:
    """
    Convenience function to query the RAG chain.
    
    Args:
        chain: The RAG chain instance
        question: The question to ask
        
    Returns:
        Dictionary with answer and source documents
    """
    return RAGChainFactory.query_rag_chain(chain, question)

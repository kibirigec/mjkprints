import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext()

const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  LOAD_CART: 'LOAD_CART'
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingItem = state.find(item => item.id === action.payload.id)
      
      if (existingItem) {
        return state.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      
      return [...state, { ...action.payload, quantity: 1 }]
    }

    case CART_ACTIONS.REMOVE_ITEM:
      return state.filter(item => item.id !== action.payload)

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { id, quantity } = action.payload
      
      if (quantity <= 0) {
        return state.filter(item => item.id !== id)
      }
      
      return state.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    }

    case CART_ACTIONS.CLEAR_CART:
      return []

    case CART_ACTIONS.LOAD_CART:
      return action.payload || []

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('mjkprints-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        dispatch({ type: CART_ACTIONS.LOAD_CART, payload: parsedCart })
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
        localStorage.removeItem('mjkprints-cart')
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('mjkprints-cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: product })
  }

  const removeFromCart = (productId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: productId })
  }

  const updateQuantity = (productId, quantity) => {
    dispatch({ 
      type: CART_ACTIONS.UPDATE_QUANTITY, 
      payload: { id: productId, quantity } 
    })
  }

  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART })
  }

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const isInCart = (productId) => {
    return cart.some(item => item.id === productId)
  }

  const getItemQuantity = (productId) => {
    const item = cart.find(item => item.id === productId)
    return item ? item.quantity : 0
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getTotalItems,
    isInCart,
    getItemQuantity
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  
  return context
}
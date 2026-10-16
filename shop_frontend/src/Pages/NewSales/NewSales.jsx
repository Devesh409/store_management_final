import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bars3BottomLeftIcon } from '@heroicons/react/24/outline';
import Aside from '../../Components/Aside/Aside';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import baseUrl from '../../utils/baseurl';
import { setProducts } from '../../Redux/products/productSlice';
import { setSale } from '../../Redux/sales/saleSlice';
import { setloginStatus } from '../../Redux/login/isLogin';
import {
  buildAuthHeaders,
  clearStoredToken,
  getStoredToken,
  isUnauthorizedStatus,
} from '../../utils/auth';

const NewSales = () => {
  const navigate = useNavigate();
  // get all products from store:
  const products = useSelector((state) => state.product.products);
  const dispatch = useDispatch();
  const redirectToLogin = () => {
    clearStoredToken();
    dispatch(setloginStatus(false));
    navigate("/login");
  }

  //check Islogin
  const isLogin = useSelector((state) => state.login.loginStatus);
  useEffect(() => {
    // check if login:
    if (!isLogin) {
      // not login, take to login page:
      navigate("/login")
    }
  }, [isLogin, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm({/** resolver: yupResolver(schema), */ });

  const validateCustName = (name) => {
    if (!name.trim()) {
      return "Name is required!";
    }
  }
  const validateCustEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!email.trim()) {
      return "Email is required!";
    }
    if (!regex.test(email)) {
      return "Invalid Email format!";
    }
  }
  const validateCustContact = (contact) => {
    if (!contact.trim()) {
      return "Contact is required";
    } else if (contact.length != 10) {
      return "Contact must be 10 characters";
    }
  }

  const [selectedProductDetails, setselectedProductDetails] = useState({
    productId: "",
    name: "",
    qty: 1,
    stock: "",
    price: 0,
    discount: 0,
    subtotal: 0
  })
  const handleSelectProductChange = (e) => {
    const selectedProductName = e.target.value;
    const index = products.findIndex((value) => value.p_name === selectedProductName)
    // set name, price and stock:
    setselectedProductDetails({
      ...selectedProductDetails,
      productId: products[index]._id,
      name: products[index].p_name,
      stock: products[index].p_stock,
      price: products[index].p_price,
      discount: 0,
    })
    // update subtotal:
    setselectedProductDetails(prev => ({ ...prev, subtotal: (prev.price * prev.qty * ((100 - prev.discount) / 100)).toFixed(2) }))
  }
  const handleSelectQuantityChange = (e) => {
    const selectedProductQty = e.target.value;
    // set qunatity:
    setselectedProductDetails({ ...selectedProductDetails, qty: Number(selectedProductQty) })
    // update subtotal:
    setselectedProductDetails(prev => ({ ...prev, subtotal: (prev.price * prev.qty * ((100 - prev.discount) / 100)).toFixed(2) }))
  }
  const handleSelectDiscountChange = (e) => {
    const selectedProducDisc = e.target.value;
    // set discount:
    setselectedProductDetails({ ...selectedProductDetails, discount: Number(selectedProducDisc) })
    // update subtotal:
    setselectedProductDetails(prev => ({ ...prev, subtotal: (prev.price * prev.qty * ((100 - prev.discount) / 100)).toFixed(2) }))
  }


  const [cartItems, setcartItems] = useState([]);

  const handleAddToCart = (e) => {
    e.preventDefault();

    // validation:
    if (!selectedProductDetails.qty) {
      toast.error("Qty cannot be empty");
      return false;
    }
    if (selectedProductDetails.discount < 0 || selectedProductDetails.discount > 100) {
      toast.error("Invalid Discount");
      return false;
    }

    // stock availablity validation:
    if (selectedProductDetails.qty > selectedProductDetails.stock) {
      toast.error("Invalid Stock value");
      return false;
    }

    // check if product is already added in cart
    const index = cartItems.findIndex((value) => value.c_name === selectedProductDetails.name);
    if (index >= 0) {
      toast.error("Already added in cart");
      return false;
    }

    // add product to card:
    setcartItems([...cartItems, {
      c_id: selectedProductDetails.productId,
      c_name: selectedProductDetails.name,
      c_quantity: selectedProductDetails.qty,
      c_unit_price: selectedProductDetails.price,
      c_discount: selectedProductDetails.discount,
      c_subtotal: selectedProductDetails.subtotal,
    }])
  }

  const onSubmit = async (data) => {
    // console.log({ ...data, cartItems });

    if (cartItems.length === 0) {
      toast.error("Add at least one product to the cart");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      redirectToLogin();
      return;
    }

    let requestOptions = {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ ...data, cartItems }),
      redirect: 'follow',
      credentials: 'include' //!important
    };

    try {
      const response = await fetch(`${baseUrl}/createsales`, requestOptions)
      if (isUnauthorizedStatus(response.status)) {
        redirectToLogin();
        return;
      }

      const result = await response.json()
      if (result.status) {
        toast.success("Sales Created succesfully");
        // to update lists, empty the products slice that will result on automatic fetching of new items.
        dispatch(setProducts([]));
        // same as above for sales slice
        dispatch(setSale([]));
      } else {
        toast.error(result.message || "Something went wrong! try again");
        console.log('Error::new sales::result', result.message)
      }
    } catch (error) {
      toast.error("Something went wrong! ty again");
      console.log('Error::new sales::', error)
    } finally {
      const f = document.getElementById("form_new_sales");
      f.reset();
    }
  }

  const cartGrandTotal = cartItems.reduce((acc, obj) => {
    return Number((parseFloat(acc) + parseFloat(obj.c_subtotal)).toFixed(2));
  }, 0);
  const cartUnits = cartItems.reduce((acc, obj) => acc + Number(obj.c_quantity || 0), 0);

  return (
    <div className='page-shell'>
      {/* main */}
      <div className="drawer lg:drawer-open">
        <input id="sidebar_drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content px-4 md:px-6">
          <div className='page-stack'>
            <section className="page-panel">
              <div className="page-header">
                <div>
                  <span className="hero-chip">Sales studio</span>
                  <h1 className='page-title'>Create a polished new order</h1>
                  <p className="page-subtitle">
                    Capture customer details, build the cart, and place orders with a faster
                    workflow that keeps stock and billing aligned.
                  </p>
                </div>
                <div className="page-header-actions">
                  <label htmlFor="sidebar_drawer" className="btn btn-sm drawer-button lg:hidden">
                    <Bars3BottomLeftIcon className='w-5 h-5' />
                  </label>
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">Cart Items</div>
                  <div className="stat-value">{cartItems.length}</div>
                  <div className="stat-note">Distinct products prepared for this order.</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Units Selected</div>
                  <div className="stat-value">{cartUnits}</div>
                  <div className="stat-note">Total quantity currently sitting in the cart.</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Estimated Total</div>
                  <div className="stat-value">Rs.{cartGrandTotal.toFixed(2)}</div>
                  <div className="stat-note">Live total after quantity and discount adjustments.</div>
                </div>
              </div>
            </section>

            <form onSubmit={handleSubmit(onSubmit)} id='form_new_sales' className="page-stack">
              <section className="page-panel">
                <div className="page-body">
                  <h4 className='section-title'>Customer details</h4>
                  <p className="section-subtitle">
                    Start by capturing who this order belongs to so invoices and sales history stay organized.
                  </p>

                  <div className="form-box flex flex-wrap md:flex-nowrap mt-4">
                    <div className='w-full'>
                      <label className="form-control lg:max-w-xs px-2">
                        <div className="label">
                          <span className="label-text">Customer Name</span>
                        </div>
                        <input type="text"
                          name='cust_name'
                          {...register('cust_name', { validate: validateCustName })}
                          placeholder="Type here" className="input input-bordered w-full lg:max-w-xs " />
                      </label>
                      <div className="label-text text-xs text-error h-8 p-2">
                        {errors.cust_name && <p>{errors.cust_name.message}</p>}
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="form-control w-full lg:max-w-xs px-2">
                        <div className="label">
                          <span className="label-text">Customer Email</span>
                        </div>
                        <input type="email"
                          name='cust_email'
                          {...register('cust_email', { validate: validateCustEmail })}
                          placeholder="Type here" className="input input-bordered w-full lg:max-w-xs " />
                      </label>
                      <div className="label-text text-xs text-error h-8 p-2">
                        {errors.cust_email && <p>{errors.cust_email.message}</p>}
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="form-control w-full lg:max-w-xs px-2">
                        <div className="label">
                          <span className="label-text">Customer Contact</span>
                        </div>
                        <input type="number"
                          name='cust_contact'
                          {...register('cust_contact', { validate: validateCustContact })}
                          placeholder="Type here" className="input input-bordered w-full lg:max-w-xs " />
                      </label>
                      <div className="label-text text-xs text-error h-8 p-2">
                        {errors.cust_contact && <p>{errors.cust_contact.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="page-panel">
                <div className="page-body">
                  <h4 className='section-title'>Order details</h4>
                  <p className="section-subtitle">
                    Choose a product, set quantity, apply discounts, and push it into the cart.
                  </p>

                  <div className="form-box flex items-center flex-wrap gap-y-4 mt-4">
                    <label className="form-control w-full lg:max-w-xs px-2">
                      <div className="label ">
                        <span className="label-text ">Select Product</span>
                      </div>
                      <select name='select_product_id' className="select " onChange={handleSelectProductChange} defaultValue={0}>
                        <option disabled value={0}>Select Product</option>
                        {products.map((elem, i) => {
                          return (
                            <option key={i} value={elem.p_name} >{elem.p_name}</option>
                          )
                        }).reverse()}
                      </select>
                    </label>

                    <label className="form-control px-2">
                      <div className="label">
                        <span className="label-text">Enter Quantity</span>
                      </div>
                      <input type="number"
                        name='select_quantity'
                        defaultValue={1}
                        min={1}
                        onChange={handleSelectQuantityChange}
                        placeholder="Type here"
                        className="input input-bordered w-24" />
                    </label>

                    <label className="form-control px-2">
                      <div className="label">
                        <span className="label-text">Discount in %</span>
                      </div>
                      <input type="number"
                        name='select_discount'
                        defaultValue={0}
                        min={0}
                        max={100}
                        onChange={handleSelectDiscountChange}
                        placeholder="Type here"
                        className="input input-bordered  w-24" />
                    </label>

                    <label className="form-control px-2">
                      <div className="label">
                        <span className="label-text">Stock</span>
                      </div>
                      <input type="number"
                        name='select_product_stock'
                        value={selectedProductDetails.stock}
                        disabled
                        className="input input-bordered  w-24" />
                    </label>

                    <label className="form-control w-24">
                      <div className="label">
                        <span className="label-text">SubTotal</span>
                      </div>
                      <input type="text" placeholder="Type here" value={selectedProductDetails.subtotal} className="input input-bordered w-24 " disabled />
                    </label>
                    <div className="text-center p-2">
                      <button onClick={handleAddToCart} className="btn btn-primary">Insert Product</button>
                    </div>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="page-body pt-0">
                    <div className="table-wrap max-h-[80vh]">
                      <table className="table cart_table">
                        <thead>
                          <tr className='text-left'>
                            <th>S.No</th>
                            <th>Name</th>
                            <th>Qunatity</th>
                            <th>unit Price</th>
                            <th>Discount</th>
                            <th>Action</th>
                            <th>subtotal</th>
                          </tr>
                        </thead>
                        <tbody className='text-left'>
                          {cartItems.map((elem, i) => {
                            return (
                              <tr className="hover" key={i}>
                                <th>{i + 1}</th>
                                <td>{elem.c_name}</td>
                                <td>{elem.c_quantity}</td>
                                <td>Rs.{elem.c_unit_price}</td>
                                <td>{elem.c_discount}</td>
                                <td className='flex flex-wrap gap-2'>
                                  <button className='btn btn-error btn-sm' onClick={() => {
                                    setcartItems((prev) => prev.filter((e) => e.c_id != elem.c_id))
                                  }}>Delete</button>
                                </td>
                                <td>Rs.{elem.c_subtotal}</td>
                              </tr>
                            )
                          })}
                          <tr className="hover">
                            <td colSpan={4}></td>
                            <td>Grand Total</td>
                            <td>Rs.{cartGrandTotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td colSpan={6} className='text-center'>
                              <button type='submit' className='btn btn-primary'>Place Order</button></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </form>
          </div>
        </div>

        {/* sidebar starts */}
        <div className="drawer-side md:h-[80vh] h-full">
          <label htmlFor="sidebar_drawer" aria-label="close sidebar" className="drawer-overlay"></label>

          <Aside />
        </div>
        {/* sidebar ends */}
      </div>
      {/* main end */}

      <Toaster />
    </div>
  )
}

export default NewSales

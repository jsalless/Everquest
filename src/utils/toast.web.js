import React from 'react';
import { ToastContainer as RTToastContainer, toast as rtToast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const toast = {
  success: (message, options) => {
    rtToast.dismiss();
    return rtToast.success(message, options);
  },
  error: (message, options) => {
    rtToast.dismiss();
    return rtToast.error(message, options);
  },
  info: (message, options) => {
    rtToast.dismiss();
    return rtToast.info(message, options);
  },
  warn: (message, options) => {
    rtToast.dismiss();
    return rtToast.warn(message, options);
  },
};

export function ToastContainer() {
  return (
    <RTToastContainer
      position="top-center"
      autoClose={3500}
      limit={1}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="colored"
      toastStyle={{
        borderRadius: 12,
        margin: '10px auto',
        width: '92%',
        maxWidth: 380,
        fontSize: 14,
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      }}
    />
  );
}

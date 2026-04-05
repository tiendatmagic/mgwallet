/**
 * MG Wallet - Extension Background Script
 * Service Worker for Manifest V3
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('MG Wallet Extension Installed');
});

// Communication with popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_ACCOUNTS') {
    // Return current address if unlocked
    chrome.storage.local.get(['address', 'isLocked'], (result) => {
      if (!result.isLocked && result.address) {
        sendResponse({ accounts: [result.address] });
      } else {
        sendResponse({ accounts: [] });
      }
    });
    return true; // async response
  }
  
  if (request.type === 'SEND_TRANSACTION') {
    // Trigger popup for signing
    // In a real wallet, this would open a new window
    chrome.windows.create({
      url: 'confirm.html',
      type: 'popup',
      width: 400,
      height: 600
    });
    sendResponse({ success: true });
  }
});

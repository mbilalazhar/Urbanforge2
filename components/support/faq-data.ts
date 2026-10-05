export const faqGroups = [
  { id: "orders", title: "Orders & payments", questions: [
    ["How do I place an order?", "Choose a product, select an available size and colour, and add it to your cart. Review your items, then continue to checkout to enter your delivery details and place your order."],
    ["How can I check my order status?", "Sign in and open My Account to view your order history and fulfilment status. If you need help locating an order, contact us with your order number and the email address used at checkout."],
    ["Can I change or cancel my order?", "Contact us as soon as possible with your order number and the change you need. Available options depend on whether your order has already been prepared or dispatched."],
    ["Which payment methods can I use?", "The available payment methods are displayed at checkout. Review the payment option and your order total before confirming your purchase."],
    ["How do I use a discount code?", "Enter your code in the promo code field at checkout and apply it before placing your order. Check the updated total. Codes may have expiry dates, minimum spends or product restrictions."],
  ] },
  { id: "delivery", title: "Shipping & delivery", questions: [
    ["How much does shipping cost?", "Your shipping charge is calculated at checkout based on the available delivery options and your order details. Review the final order summary before you confirm."],
    ["How long will my order take to arrive?", "Check the delivery information available at checkout for your destination. Timing can vary with your location, order processing and courier availability. Contact us for help with a specific order."],
    ["Do you offer international shipping?", "Delivery availability depends on your destination. Check whether your address is supported at checkout, or contact our team before ordering if you are unsure."],
    ["Can I change my delivery address?", "Contact us promptly with your order number and the corrected address. We will check whether the address can still be updated. Changes may not be possible once an order has been dispatched."],
    ["What should I do if my parcel is delayed or missing?", "Check the order status in your account and any delivery updates you have received. If the parcel is still missing or the information is unclear, contact us with your order number so we can investigate."],
  ] },
  { id: "returns", title: "Returns & exchanges", questions: [
    ["How do I request a return?", "Use our contact form and select Returns & exchanges. Include your order number, the item you want to return and the reason. Please wait for return instructions before sending anything back."],
    ["Can I exchange an item for a different size?", "Contact us with your order number and the size you would like. We will check the available options and stock before providing instructions."],
    ["What if I receive a damaged or incorrect item?", "Keep the item and packaging, take clear photos of the issue, and contact us with your order number and a description. Our team can then advise you on the next steps and how to share the photos."],
    ["When will I receive my refund?", "An approved return and a completed refund are separate steps. Processing time depends on your return and payment method. Contact us with your order number for an update on an approved refund."],
    ["Can sale items be returned?", "Return options can depend on the item, the offer and the reason for returning it. Check any conditions shown when purchasing and contact us for guidance about your specific order."],
  ] },
  { id: "products", title: "Products & sizing", questions: [
    ["How do I choose the right size?", "Check the sizes and fit information on the product page. If you need more detail, send us the product name and your sizing question before placing an order."],
    ["Where can I find fabric and care information?", "Check the product description for material information and follow the care label supplied with your item. If a detail is missing, contact us with the product name."],
    ["Will an out-of-stock item be restocked?", "Availability can change, and a restock is not guaranteed. Check the product page again or contact us with the item, colour and size you are looking for."],
    ["Will the colour look exactly like the photos?", "Product photos help show an item’s appearance, but lighting and screen settings can affect how colours look. Read the product description for the listed colour."],
    ["Does adding an item to my cart reserve it?", "Adding an item to your cart does not reserve stock or its price. Current availability and pricing are checked again during checkout."],
  ] },
  { id: "account", title: "Account & support", questions: [
    ["How do I create an UrbanForge account?", "Open the sign-up page and enter your name, email address and a password. Your account lets you manage your profile, saved addresses, wishlist and order history."],
    ["How do I update my contact details?", "Sign in and open My Account to edit your profile and saved delivery details. Updating a saved address does not automatically change the address on an existing order."],
    ["How does my wishlist work?", "Sign in and use the heart icon on a product to save it. Open your wishlist to review or remove saved items. Saving an item does not reserve stock."],
    ["How can I contact the support team?", "Use the Contact Us page to send a message, or email info@urbanforge.com. Include your order number when relevant, and never include your password or full payment details."],
    ["Where can I read your store policies?", "Our Privacy Policy, Terms & Conditions and Cookie Policy are linked in the footer. They explain the use of account information, shopping terms and browser storage."],
  ] },
] as const;

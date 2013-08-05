function getCardData(){
    // Actual form data
    var $form = $("#payment_form");
    return {
        "name": $('#name', $form).val(),
        "card_number": $('#card_number', $form).val(),
        "expiration_month": $('#expiration_month', $form).val(),
        "expiration_year": $('#expiration_year', $form).val(),
        "security_code": $('#security_code', $form).val()
    };
}

// Charge credit card
function charge(event){
 
    // event.preventDefault();
    // Securely tokenize card data using Balanced
    var cardData = getCardData();
    balanced.card.create(cardData, function(response) {
      
        var x = 10;
 
        // Handle Errors (Anything that's not Success Code 201)
        if(response.status!=201){
            alert(response.error.description);
            return false;
        }
        // Submit form with Card URI
        $('#card_uri').val(response.data.uri);
        console.log('Got data back from BP: ' + response.data.uri);
        $('#payment_form').submit();
        // return true;
 
    });
 
};
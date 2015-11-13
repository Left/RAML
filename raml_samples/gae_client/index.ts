/**
 * Created by Vadim on 11/13/2015.
 */

function createPerson() {
    var http = new XMLHttpRequest();
    var url = "http://localhost:8080/person";
    http.open("POST", url, true);

    http.setRequestHeader("Content-type", "application/json");
    // http.setRequestHeader("Connection", "close");

    http.onreadystatechange = function() {//Call a function when the state changes.
        if(http.readyState == 4 && http.status == 200) {
            alert(http.responseText);
        }
    }
    http.send('{ "firstName": "Vadim", "lastName": "Ridosh" }');
}
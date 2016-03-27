/**
 * Created by Scott on 4/13/2015.
 */

var socket = io();

$(document).ready(function(){
    //Socket.io
    socket.emit('status');
    socket.on('connected', function(){
        $('#dentonStatus').text('Connected')
    });
    socket.on('notConnected', function(){
        $('#dentonStatus').text('Disconnected')
    })

    $('#startDenton').click(function() {
        socket.emit('start');
    });

    $('#stopDenton').click(function(){
        socket.emit('stop');
    });
    // !Socket.io

    //Twitter
    twitterFetcher.fetch( '640675267531423744', 'twitter-news', 3, true);

});
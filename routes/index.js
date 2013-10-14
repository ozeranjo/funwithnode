module.exports = function(app) {

    // Home/main
    app.get('/', function(req, res) {
        res.render('index', { title: 'A real-time math game demonstrating the power of Node.js & Socket.IO' })
    })

}
var should = require('should'),
    funwithnode2 = require('../lib/funwithnode2.js')


describe('funwithnode2', function () {
    before(function () {

    })
    it('should be awesome', function(){
        funwithnode2.awesome().should.eql('awesome')
    })
})
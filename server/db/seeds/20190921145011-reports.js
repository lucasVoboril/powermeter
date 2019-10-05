/* eslint-disable object-curly-newline */

module.exports = {
  up(queryInterface, _Sequelize) {
    return queryInterface.bulkInsert('Reports', [
      {
        name: 'Cocina',
        timeStart: 1570288394060,
        secondsDuration: 60 * 60,
        averagePower: 2,
        maximumPower: 3
      }
    ], {});
  },

  down(queryInterface, _Sequelize) {
    return queryInterface.bulkDelete('Reports');
  }
};

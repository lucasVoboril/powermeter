/* eslint-disable no-loop-func */
/* eslint-disable eqeqeq */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-undef */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */

const _ = require('lodash');

module.exports = function reportsService(
  Report,
  reportsRepository,
  tempReport,
  lock
) {
  return {
    nuevo,
    notify,
    getReport,
    list,
    listForSimulations,
    getMedition,
    del,
    eraseTemp,
    isTemp,
    lastReport,
    tempReportInProgress,
    mergeReports
  };

  function tempReportInProgress() {
    return tempReport;
  }

  function eraseTemp() {
    tempReport = null;
  }

  function isTemp() {
    return !!tempReport;
  }
  async function del(dispoId) {
    return reportsRepository.del(dispoId);
  }

  async function getReport(reportId) {
    if (reportId === 'temp') return { now: Date.now(), ...tempReport }; // reportsRepository.getReport(reportId);
    const report = await reportsRepository.getReport(reportId);
    return populateCurrent(report);
  }


  async function mergeReports(reportsIds, name) {
    const reports = [];
    for (reportId of reportsIds) {
      reports.push(await reportsRepository.getReport(reportId));
    }

    const meditions = _.flatMap((reports.map(report => report.meditions)));

    const averagePower = fixed(_.sum(meditions.map(medition => medition.averagePower)));

    const report = { ...reports[0], maximumPower: 0, name, meditions, meditions2: _.cloneDeep(meditions), averagePower };
    temporalMeditions = [];

    do {
      let temporalPuntualMeditions = [];
      for (medition of report.meditions2) {
        if (medition.puntualMeditions.length > 0) {
          temporalPuntualMeditions.push({ ...medition.puntualMeditions[0], meditionId: medition.id });
        }
      }
      temporalPuntualMeditions = temporalPuntualMeditions.sort((a, b) => (a.offset - b.offset));
      minorPuntualMedition = temporalPuntualMeditions[0];
      report.meditions2[report.meditions2.findIndex(medition => medition.id == minorPuntualMedition.meditionId)].puntualMeditions.shift();
      elem = temporalMeditions.findIndex(elem => elem.meditionId == minorPuntualMedition.meditionId);
      if (elem != -1) {
        temporalMeditions[elem] = { ...minorPuntualMedition };
      } else {
        temporalMeditions.push({ ...minorPuntualMedition });
      }
      report.maximumPower = fixed(Math.max(report.maximumPower || 0, _.sum(temporalMeditions.map(elem => elem.value))));
    } while (_.sum(report.meditions2.map(medition => medition.puntualMeditions.length)));

    for (meditionId in report.meditions) {
      report.meditions[meditionId].id = undefined;
    }
    report.id = undefined;
    newReport = await reportsRepository
      .saveReport(report);
    console.log(newReport);
    return newReport;


  }
  async function notify(sensorId, meditionValue) {
    await lock.acquire();

    if (process.env.SHOW_CONSOLE_LOGS === true) console.log(tempReport);

    // Buscar si existe una medicion asociada a un sensor
    const activeMedition = tempReport
      && tempReport.meditions.find(medition => medition.dispoId === sensorId);

    if (hasFinish()) await saveReport(tempReport).then(() => eraseTemp());

    if (tempReport && activeMedition) {
      updateActiveAndMaxMeditions(activeMedition, meditionValue);
    }

    await lock.release();
  }

  function hasFinish() {
    return tempReport && tempReport.timeEnd < Date.now();
  }

  async function saveReport() {
    // console.log(tempReport)
    await reportsRepository
      .saveReport(tempReport)
      .catch(() => (tempReport = null));
    tempReport = null;
  }

  function updateActiveAndMaxMeditions(activeMedition, medicion) {
    modifyMedition(activeMedition, medicion);
    updateTemporalReport();
    // console.log(tempReport)
  }

  function fixed(num, e = 2) {
    return +`${Math.round(`${num}e+${e}`)}e-${e}`;
  }

  function calculateAverage(medition) {
    if (!medition.puntualMeditions) return 0;

    if (medition.puntualMeditions.length > 1) {

      const oldPush = medition.lastPush;
      medition.lastPush = medition.puntualMeditions[medition.puntualMeditions.length - 1].offset;

      return fixed((medition.averagePower
      * oldPush
      + medition.puntualMeditions[medition.puntualMeditions.length - 1].value
      * (medition.lastPush - oldPush))
      / medition.lastPush, 2);

    }
    return 0;
  }

  function calculateMeditions(medition, currentPower, averagePower = null) {
    medition.maximumPower = fixed(
      Math.max(medition.maximumPower, currentPower),
      1
    );
    medition.currentPower = fixed(currentPower, 1);
    if (!averagePower) {
      medition.averagePower = calculateAverage(medition);
    } else {
      medition.averagePower = averagePower;
    }

    return medition;
  }

  function updateTemporalReport() {
    const currentPower = _.sum(
      tempReport.meditions.map(medicionInt => medicionInt.currentPower)
    );
    const averagePower = fixed(_.sum(
      tempReport.meditions.map(medicionInt => medicionInt.averagePower)
    ));
    tempReport = calculateMeditions(tempReport, currentPower, averagePower);
    tempReport = populateCurrent(tempReport);
    return tempReport;
  }

  function significantChange(currentValue, previousMeditionValue) {
    const correctionFactor = Report.SIMILAR_VALUES_ON_REPORTS;
    const minValue = (1 - correctionFactor) * currentValue;
    const maxValue = (1 + correctionFactor) * currentValue;

    return previousMeditionValue > maxValue || previousMeditionValue < minValue;
  }

  function modifyMedition(medicionAMofidicar, value) {
    const previousMedition = medicionAMofidicar.puntualMeditions.pop();

    const changed = previousMedition
      ? significantChange(value, previousMedition.value)
      : true;

    if (previousMedition) {
      if (previousMedition.blocked) {
        medicionAMofidicar.puntualMeditions.push(previousMedition);
      } else if (changed) {
        medicionAMofidicar.puntualMeditions.push(previousMedition);
      }
    }

    medicionAMofidicar.puntualMeditions.push({
      offset: parseInt(Date.now() - tempReport.realTimeStart, _),
      value,
      blocked: changed
    });

    medicionAMofidicar = calculateMeditions(medicionAMofidicar, value);

    return medicionAMofidicar;
  }

  function populateCurrent(medition) {
    medition.currentCurrent = fixed(medition.currentPower / 220);
    medition.averageCurrent = fixed(medition.averagePower / 220);
    medition.maximumCurrent = fixed(medition.maximumPower / 220);
    if (medition.meditions) {
      medition.meditions = medition.meditions.map(populateCurrent);
    }
    return medition;
  }

  async function nuevo({ name, secondsDuration, meditions, timeStart }) {
    tempReport = {
      name,
      secondsDuration,
      meditions: meditions.map(initializateMeditions),
      timeStart,
      realTimeStart: Date.now(),
      timeEnd: Date.now() + secondsDuration
    };

    tempReport = initializateMeditions(tempReport);
    return 'temp';
  }

  function initializateMeditions(medition) {
    return {
      ...medition,
      currentPower: 0,
      maximumPower: 0,
      averagePower: 0,
      meditionCounter: 0,
      lastPush: 0
    };
  }

  async function list() {
    return reportsRepository.list();
  }

  async function listForSimulations() {
    return reportsRepository.listForSimulations();
  }

  async function getMedition(meditionId) {
    return reportsRepository.getMedition(meditionId);
  }

  async function lastReport() {
    return reportsRepository.last();
  }
};

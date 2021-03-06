module.exports = function sensorsService(sensorsRepository, reportsService, sessionId, Medition) {
  return {
    list, report, update, del
  };


  function fixed(num, e = 2) {
    return +(`${Math.round(`${num}e+${e}`)}e-${e}`);
  }

  function isOnline(dispo) {
    // const isSameSession = sessionId === dispo.sessionId;
    const isSameSession = true;
    const timeDistance = Math.abs(dispo.lastPush - Date.now()) < 10000;
    return isSameSession && timeDistance;
  }

  function adaptMeditions(dispo) {
    const currentMedition = isOnline(dispo) && dispo.currentMedition ? dispo.currentMedition : 0;
    const currentCurrent = fixed(currentMedition / 220);
    return {
      ...dispo, currentCurrent, isOnline: isOnline(dispo), currentMedition, name: dispo.name ? dispo.name : `Sensor ${dispo.id}`
    };
  }

  async function generateListLastConsumptions(dispoId, consumo) {
    const dispo = await sensorsRepository.get(dispoId);
    const lastConsumptions = [
      consumo,
      ...((dispo && dispo.lastConsumptions) || []).slice(0, 8)
    ];
    return lastConsumptions;
  }

  async function report(dispoId, data) {
    /*
   anda mal
    const lastConsumptions = await generateListLastConsumptions(
      dispoId,
      data.medicion
    );
    */
    await sensorsRepository.upsert(dispoId, {
      ...data,
      lastPush: Date.now()
    });

    await reportsService.notify(dispoId, data.currentMedition).catch(console.log);
  }

  async function del(dispoId) {
    await sensorsRepository.del(dispoId);
  }

  async function update(dispoId, name) {
    await sensorsRepository.upsert(dispoId, {
      name
    });
  }

  async function list() {
  //  const meditionslist = .map(medition => adaptMedition(medition));
    const listado = (await sensorsRepository.list()).map(adaptMeditions);
    if (process.env.SHOW_CONSOLE_LOGS === true) console.log(listado);
    return listado; // .map(adaptMeditions);
  }
};

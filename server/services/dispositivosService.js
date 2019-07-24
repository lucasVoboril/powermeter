module.exports = function dispositivosService(
  dispositivosRepository,
  sessionId
) {
  return {
    list,
    report,
    actualizar,
    borrar
  };

  //    { lastPush: Date.now(), sessionId }

  function isOnline(dispo) {
    const isSameSession = sessionId === dispo.sessionId;
    const timeDistance = Math.abs(dispo.lastPush - Date.now()) < 5000;
    return isSameSession && timeDistance;
  }

  function adaptDispositivos(dispo) {
    const {
      name, dispoId, medicion, pinza, lastPush
    } = dispo;

    return {
      name,
      lastPush,
      dispoId,
      isOnline: isOnline(dispo),
      pinza,
      medicion
    };
  }

  async function report(dispoId, data) {
    await dispositivosRepository.upsert(dispoId, {
      sessionId,
      pinza: data.pinza,
      medicion: data.medicion,
      lastPush: Date.now()
    });
  }

  async function borrar(dispoId) {
    await dispositivosRepository.del(dispoId);
  }

  async function actualizar(dispoId, name) {
    await dispositivosRepository.upsert(dispoId, {
      name
    });
  }

  async function list() {
    const listado = await dispositivosRepository.list();
    return listado.map(adaptDispositivos);
  }
};

import axiosClient from './axiosClient'

const recursosApi = {
  habilitar: (vueloId, body) =>
    axiosClient.post(`/api/v1/vuelos/${vueloId}/recursos`, body),
  deshabilitar: (vueloId, recursoId) =>
    axiosClient.patch(`/api/v1/vuelos/${vueloId}/recursos/${recursoId}/deshabilitar`),
}

export default recursosApi

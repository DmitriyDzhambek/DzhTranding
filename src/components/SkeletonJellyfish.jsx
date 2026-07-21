/**
 * SkeletonJellyfish — скелетон загрузки в виде пульсирующих медуз
 * Вместо серых стандартных скелетонов — живые медузы
 */

function SkeletonJellyfish() {
  return (
    <div className="jellyfish-skeleton">
      {/* Медуза 1 */}
      <div className="jelly">
        <div className="jelly-body"></div>
        <div className="jelly-tentacles">
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
        </div>
      </div>

      {/* Медуза 2 */}
      <div className="jelly">
        <div className="jelly-body"></div>
        <div className="jelly-tentacles">
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
        </div>
      </div>

      {/* Медуза 3 */}
      <div className="jelly">
        <div className="jelly-body"></div>
        <div className="jelly-tentacles">
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
          <div className="tentacle"></div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonJellyfish

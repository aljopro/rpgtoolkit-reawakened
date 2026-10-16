// Authored test fixture for ticket 3.6; this is not copied from a legacy file.
// It exercises object construction, typed parameters, member arrays, operator
// dispatch, destructor lifetime, and the CArray-shaped API used by the driver.

class CArray
{
public:
    method CArray() {
        m_bound = -1;
    }

    method CArray(upperBound) {
        m_bound = upperBound;
    }

    method clone(CArray rhs) {
        local(ret) = CArray();
        local(bound) = rhs->getBound();
        ret->resize(bound);
        for (local(i) = 0; i <= bound; i++) {
            ret[i] = rhs[i];
        }
        return ret;
    }

    method operator=(CArray rhs) {
        m_bound = rhs->getBound();
        for (local(i) = 0; i <= m_bound; i++) {
            this[i] = rhs[i];
        }
    }

    method operator[](idx) {
        if (idx > m_bound) {
            m_bound = idx;
        }
        return &m_data[idx];
    }

    method getBound() {
        return m_bound;
    }

    method resize(newSize) {
        m_bound = newSize;
    }

    method ~CArray() {
        kill(m_bound);
    }

private:
    var m_data[];
    var m_bound;
}
